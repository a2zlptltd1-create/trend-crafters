/**
 * Trend Crafters - B2B Auth System
 * Handles Login, Signup, and Admin Management
 */

const B2B_AUTH = {
    // In a real app, this would be your Supabase/Backend connection
    // For now, we use a robust LocalStorage mock for the workflow demo
    users: JSON.parse(localStorage.getItem('tc_users')) || [
        {
            id: 'admin-001',
            fullname: 'System Admin',
            email: 'admin@trendcrafters.us',
            password: 'admin', // In production, this is hashed on server
            role: 'admin',
            status: 'approved'
        }
    ],

    currentUser: JSON.parse(localStorage.getItem('tc_current_user')) || null,

    // SHA-256 Simulation for Demo Security
    async hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async init() {
        this.setupForms();
        this.protectRoutes();
        this.renderAdminUsers();
    },

    saveUsers() {
        localStorage.setItem('tc_users', JSON.stringify(this.users));
    },

    async signup(formData) {
        // Check if user exists
        if (this.users.find(u => u.email === formData.email)) {
            return { success: false, message: 'Email already registered.' };
        }

        const hashedPassword = await this.hashPassword(formData.password);

        const newUser = {
            id: Date.now().toString(),
            ...formData,
            password: hashedPassword,
            role: 'user',
            status: 'pending', // B2B Requirement: Default is pending
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        
        // Notify Admin & User
        if (typeof B2B_NOTIFY !== 'undefined') {
            B2B_NOTIFY.onSignup(newUser);
        }

        return { success: true, message: 'Application submitted! Status: Pending Approval.' };
    },

    async login(email, password) {
        const hashedPassword = await this.hashPassword(password);
        // Special check for default admin if not hashed yet
        const user = this.users.find(u => u.email === email && (u.password === password || u.password === hashedPassword));

        if (!user) {
            return { success: false, message: 'Invalid credentials.' };
        }

        if (user.status === 'pending') {
            return { success: false, message: 'Your account is pending approval.', status: 'pending' };
        }

        if (user.status === 'rejected') {
            return { success: false, message: 'Your account request was not approved.', status: 'rejected' };
        }

        if (user.status === 'deactivated') {
            return { success: false, message: 'Your account has been deactivated.', status: 'deactivated' };
        }

        // Success
        this.currentUser = user;
        localStorage.setItem('tc_current_user', JSON.stringify(user));
        return { success: true, user };
    },

    logout() {
        localStorage.removeItem('tc_current_user');
        window.location.href = 'login.html';
    },

    setupForms() {
        const signupForm = document.getElementById('signup-form');
        const loginForm = document.getElementById('login-form');

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const pass = document.getElementById('password').value;
                const confirm = document.getElementById('confirm-password').value;

                if (pass !== confirm) {
                    alert('Passwords do not match!');
                    return;
                }

                const data = {
                    fullname: document.getElementById('fullname').value,
                    businessName: document.getElementById('business-name').value,
                    businessType: document.getElementById('business-type').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    country: document.getElementById('country').value,
                    password: pass
                };

                const result = await this.signup(data);
                if (result.success) {
                    alert(result.message);
                    window.location.href = 'login.html?status=pending';
                } else {
                    alert(result.message);
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const pass = document.getElementById('password').value;

                const result = await this.login(email, pass);
                if (result.success) {
                    if (result.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'portal.html';
                    }
                } else {
                    this.showStatus(result.message, result.status === 'pending' ? 'warning' : 'error');
                }
            });
        }
    },

    showStatus(msg, type) {
        const msgBox = document.getElementById('auth-message');
        if (!msgBox) return;

        msgBox.style.display = 'block';
        msgBox.querySelector('p').textContent = msg;
        
        if (type === 'warning') {
            msgBox.style.backgroundColor = '#fff3cd';
            msgBox.style.color = '#856404';
            msgBox.style.border = '1px solid #ffeeba';
        } else {
            msgBox.style.backgroundColor = '#f8d7da';
            msgBox.style.color = '#721c24';
            msgBox.style.border = '1px solid #f5c6cb';
        }
    },

    protectRoutes() {
        const user = JSON.parse(localStorage.getItem('tc_current_user'));
        const path = window.location.pathname.split('/').pop();
        
        const adminPages = ['admin.html'];
        const portalPages = ['portal.html', 'shop.html'];

        if (adminPages.includes(path)) {
            if (!user || user.role !== 'admin') window.location.href = 'login.html';
        }

        if (portalPages.includes(path)) {
            if (!user || (user.role !== 'admin' && user.status !== 'approved')) {
                window.location.href = 'login.html';
            }
        }
    },

    renderAdminUsers() {
        const userList = document.getElementById('admin-user-list');
        const searchInput = document.getElementById('customer-search');
        const filterStatus = document.getElementById('customer-status-filter');
        if (!userList) return;

        const render = (filteredUsers) => {
            const displayUsers = filteredUsers.filter(u => u.role !== 'admin');
            
            // Apply status filter if exists
            const statusTerm = filterStatus ? filterStatus.value : 'all';
            const finalUsers = displayUsers.filter(u => statusTerm === 'all' || u.status === statusTerm);

            if (finalUsers.length === 0) {
                userList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No partners found.</td></tr>';
                return;
            }
            userList.innerHTML = finalUsers.map(u => `
                <tr>
                    <td>
                        <div class="user-info-main">${u.fullname}</div>
                        <div class="user-info-sub">${u.email}</div>
                    </td>
                    <td>
                        <div class="user-info-main">${u.businessName}</div>
                        <div class="user-info-sub">${u.businessType} | ${u.country}</div>
                    </td>
                    <td><span class="badge badge-${u.status}">${u.status}</span></td>
                    <td class="action-btns">
                        <button onclick="B2B_AUTH.viewProfile('${u.id}')" class="btn btn-outline btn-sm" title="View Profile"><i class="fa-solid fa-eye"></i></button>
                        ${u.status === 'pending' ? `
                            <button onclick="B2B_AUTH.updateStatus('${u.id}', 'approved')" class="btn btn-primary btn-sm">Approve</button>
                            <button onclick="B2B_AUTH.updateStatus('${u.id}', 'rejected')" class="btn btn-outline btn-sm">Reject</button>
                        ` : `
                            ${u.status === 'approved' ? 
                                `<button onclick="B2B_AUTH.updateStatus('${u.id}', 'deactivated')" class="btn btn-outline btn-sm">Deactivate</button>` : 
                                `<button onclick="B2B_AUTH.updateStatus('${u.id}', 'approved')" class="btn btn-primary btn-sm">Activate</button>`
                            }
                        `}
                    </td>
                </tr>
            `).join('');
        };

        render(this.users);

        if (searchInput) {
            searchInput.addEventListener('input', () => render(this.users));
        }
        if (filterStatus) {
            filterStatus.addEventListener('change', () => render(this.users));
        }
    },

    viewProfile(userId) {
        const u = this.users.find(user => user.id === userId);
        if (!u) return;

        const modal = document.getElementById('customer-modal');
        if (!modal) return;

        document.getElementById('c-name').textContent = u.fullname;
        document.getElementById('c-business').textContent = u.businessName;
        document.getElementById('c-email').textContent = u.email;
        document.getElementById('c-phone').textContent = u.phone;
        document.getElementById('c-country').textContent = u.country;
        document.getElementById('c-type').textContent = u.businessType;
        document.getElementById('c-status').textContent = u.status;
        document.getElementById('c-status').className = `badge badge-${u.status}`;
        document.getElementById('c-date').textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
        
        // Mock Orders Generated
        document.getElementById('c-orders').textContent = Math.floor(Math.random() * 5); 

        modal.style.display = 'flex';
    },

    closeProfile() {
        document.getElementById('customer-modal').style.display = 'none';
        document.getElementById('customer-edit-form').style.display = 'none';
    },

    editProfile(userId) {
        const u = this.users.find(user => user.id === userId);
        if (!u) return;

        document.getElementById('edit-c-id').value = u.id;
        document.getElementById('edit-c-name').value = u.fullname;
        document.getElementById('edit-c-business').value = u.businessName;
        document.getElementById('edit-c-email').value = u.email;
        document.getElementById('edit-c-phone').value = u.phone;
        document.getElementById('edit-c-country').value = u.country;
        document.getElementById('edit-c-type').value = u.businessType;

        document.getElementById('customer-edit-form').style.display = 'block';
    },

    saveCustomerEdit(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('edit-c-id').value;
        const index = this.users.findIndex(u => u.id === id);

        if (index !== -1) {
            this.users[index] = {
                ...this.users[index],
                fullname: document.getElementById('edit-c-name').value,
                businessName: document.getElementById('edit-c-business').value,
                email: document.getElementById('edit-c-email').value,
                phone: document.getElementById('edit-c-phone').value,
                country: document.getElementById('edit-c-country').value,
                businessType: document.getElementById('edit-c-type').value
            };
            this.saveUsers();
            this.renderAdminUsers();
            this.closeProfile();
            alert('Customer details updated successfully!');
        }
    },

    updateStatus(userId, newStatus) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.status = newStatus;
            this.saveUsers();
            this.renderAdminUsers();

            // Notify User
            if (typeof B2B_NOTIFY !== 'undefined') {
                if (newStatus === 'approved') B2B_NOTIFY.onApproval(user);
                if (newStatus === 'rejected') B2B_NOTIFY.onRejection(user);
            }
            
            alert(`User ${user.fullname} is now ${newStatus}`);
        }
    }
};

// Initialize
B2B_AUTH.init();

// Global Logout for Nav
window.logoutUser = () => B2B_AUTH.logout();
