/**
 * Trend Crafters - B2B Auth System (Supabase Backend)
 * Handles Login, Signup, Session Verification, and Admin Partner Management
 */

const B2B_AUTH = {
    currentUser: null,

    async init() {
        // Handle "Remember Me" session checks
        const rememberMe = localStorage.getItem('tc_remember_me') === 'true';
        const sessionActive = sessionStorage.getItem('tc_session_active') === 'true';

        if (!rememberMe && !sessionActive) {
            // New browser session, and "Remember me" was NOT checked -> Clear session!
            localStorage.removeItem('tc_current_user');
            if (window.supabaseClient) {
                try {
                    window.supabaseClient.auth.signOut().catch(err => console.warn(err));
                } catch (err) {
                    console.warn("SignOut failed during session clear:", err);
                }
            }
        }
        
        // Mark session as active for subsequent reloads in this tab
        sessionStorage.setItem('tc_session_active', 'true');

        // Re-verify current session from Supabase
        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    // Fetch latest profile state from DB
                    const { data: profile, error } = await window.supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (profile) {
                        const loggedInUser = {
                            id: session.user.id,
                            fullname: profile.fullname,
                            email: session.user.email,
                            businessName: profile.business_name,
                            businessType: profile.business_type,
                            phone: profile.phone,
                            country: profile.country,
                            role: profile.role,
                            status: profile.status
                        };
                        localStorage.setItem('tc_current_user', JSON.stringify(loggedInUser));
                        this.currentUser = loggedInUser;
                    } else {
                        // User exists in Auth but has no profile record (yet)
                        const user = JSON.parse(localStorage.getItem('tc_current_user'));
                        if (user && user.id !== 'admin-001') {
                            localStorage.removeItem('tc_current_user');
                            this.currentUser = null;
                        }
                    }
                } else {
                    // Check if current user is mock admin fallback
                    const user = JSON.parse(localStorage.getItem('tc_current_user'));
                    if (user && user.id !== 'admin-001') {
                        localStorage.removeItem('tc_current_user');
                        this.currentUser = null;
                    }
                }
            } catch (err) {
                console.error("Supabase session verification failed:", err);
            }
        }
        
        this.currentUser = JSON.parse(localStorage.getItem('tc_current_user')) || null;
        this.setupForms();
        this.protectRoutes();
        this.renderAdminUsers();

        // Refresh UI state dynamically after async check
        if (typeof updateNavAuth === 'function') {
            updateNavAuth();
        }
        if (typeof updateHomepagePrices === 'function') {
            updateHomepagePrices();
        }
    },

    async signup(formData) {
        if (!window.supabaseClient) {
            return { success: false, message: 'Authentication service not available.' };
        }

        try {
            // Register through Supabase Auth
            const { data, error } = await window.supabaseClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        fullname: formData.fullname,
                        businessName: formData.businessName,
                        businessType: formData.businessType,
                        phone: formData.phone,
                        country: formData.country
                    }
                }
            });

            if (error) {
                return { success: false, message: error.message };
            }

            const userId = data.user.id;

            // Trigger on_auth_user_created handles inserting the profile automatically in Postgres,
            // but we perform a self-healing client-side insert if trigger is not set up on target DB
            try {
                const { data: profileExists } = await window.supabaseClient
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();

                if (!profileExists) {
                    await window.supabaseClient.from('profiles').insert([{
                        id: userId,
                        fullname: formData.fullname,
                        email: formData.email,
                        business_name: formData.businessName,
                        business_type: formData.businessType,
                        phone: formData.phone,
                        country: formData.country,
                        role: 'user',
                        status: 'pending'
                    }]);
                }
            } catch (dbErr) {
                console.warn("Self-healing profile check failed. Relying on trigger:", dbErr);
            }

            const newUser = {
                id: userId,
                fullname: formData.fullname,
                email: formData.email,
                businessName: formData.businessName,
                businessType: formData.businessType,
                phone: formData.phone,
                country: formData.country,
                role: 'user',
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Save to offline tc_users cache
            const offlineUsers = JSON.parse(localStorage.getItem('tc_users')) || [];
            if (!offlineUsers.some(u => u.id === userId)) {
                offlineUsers.push(newUser);
                localStorage.setItem('tc_users', JSON.stringify(offlineUsers));
            }

            // Notify Admin & User (Simulated Email & Toast Alerts)
            if (typeof B2B_NOTIFY !== 'undefined') {
                B2B_NOTIFY.onSignup(newUser);
            }

            return { success: true, message: 'Application submitted! Status: Pending Approval.' };
        } catch (err) {
            console.error("Signup error:", err);
            return { success: false, message: 'Signup failed. Please try again.' };
        }
    },

    async login(email, password) {
        // 1. Try authenticating via Supabase Auth first (to support real DB admin accounts)
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (!error && data.user) {
                    const user = data.user;

                    // Retrieve profile to check approval status and role
                    const { data: profile, error: profError } = await window.supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (!profError && profile) {
                        // Admins can log in regardless of status checks
                        if (profile.role !== 'admin') {
                            if (profile.status === 'pending') {
                                await window.supabaseClient.auth.signOut();
                                return { success: false, message: 'Your account is pending approval.', status: 'pending' };
                            }

                            if (profile.status === 'rejected') {
                                await window.supabaseClient.auth.signOut();
                                return { success: false, message: 'Your account request was not approved.', status: 'rejected' };
                            }

                            if (profile.status === 'deactivated') {
                                await window.supabaseClient.auth.signOut();
                                return { success: false, message: 'Your account has been deactivated.', status: 'deactivated' };
                            }
                        }

                        // Login successful
                        const loggedInUser = {
                            id: user.id,
                            fullname: profile.fullname,
                            email: user.email,
                            businessName: profile.business_name,
                            businessType: profile.business_type,
                            phone: profile.phone,
                            country: profile.country,
                            role: profile.role,
                            status: profile.status
                        };

                        this.currentUser = loggedInUser;
                        localStorage.setItem('tc_current_user', JSON.stringify(loggedInUser));
                        return { success: true, user: loggedInUser };
                    }
                }
            } catch (err) {
                console.warn("Supabase auth login exception, trying local fallback:", err);
            }
        }

        // 2. Local Fallback for admin during development/testing/offline
        if (email === 'admin@trendcrafters.us' && password === 'admin') {
            const adminUser = {
                id: 'admin-001',
                fullname: 'System Admin',
                email: 'admin@trendcrafters.us',
                role: 'admin',
                status: 'approved'
            };
            this.currentUser = adminUser;
            localStorage.setItem('tc_current_user', JSON.stringify(adminUser));
            return { success: true, user: adminUser };
        }

        if (!window.supabaseClient) {
            return { success: false, message: 'Authentication service not available.' };
        }

        return { success: false, message: 'Invalid credentials. Please verify and try again.' };
    },

    async logout() {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        localStorage.removeItem('tc_current_user');
        this.currentUser = null;
        window.location.href = 'login.html';
    },

    setupForms() {
        const signupForm = document.getElementById('signup-form');
        const loginForm = document.getElementById('login-form');

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pass = document.getElementById('password').value;
                const confirm = document.getElementById('confirm-password').value;

                if (pass !== confirm) {
                    this.showStatus('Passwords do not match!', 'error');
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

                const submitBtn = signupForm.querySelector('button[type="submit"]');
                const origText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

                const result = await this.signup(data);
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;

                if (result.success) {
                    showToast(result.message);
                    setTimeout(() => {
                        window.location.href = 'login.html?status=pending';
                    }, 2000);
                } else {
                    this.showStatus(result.message, 'error');
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const pass = document.getElementById('password').value;
                const rememberCheckbox = document.getElementById('remember');
                const remember = rememberCheckbox ? rememberCheckbox.checked : false;

                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const origText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

                const result = await this.login(email, pass);
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;

                if (result.success) {
                    // Save the remember me choice
                    if (remember) {
                        localStorage.setItem('tc_remember_me', 'true');
                        localStorage.setItem('tc_remember_email', email);
                    } else {
                        localStorage.setItem('tc_remember_me', 'false');
                        localStorage.removeItem('tc_remember_email');
                    }

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
        const path = window.location.pathname.split('/').pop() || 'index.html';
        
        const adminPages = ['admin.html'];
        const portalPages = ['portal.html', 'checkout.html'];

        if (adminPages.includes(path)) {
            if (!user || user.role !== 'admin') {
                window.location.href = 'login.html';
            }
        }

        if (portalPages.includes(path)) {
            const isCustomCheckout = path.includes('checkout.html') && window.location.search.includes('orderId=');
            if (!isCustomCheckout) {
                if (!user || (user.role !== 'admin' && user.status !== 'approved')) {
                    // Redirect to login page and add query parameters to explain why they got kicked out
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(path);
                }
            }
        }
    },

    async renderAdminUsers() {
        const userList = document.getElementById('admin-user-list');
        const searchInput = document.getElementById('customer-search');
        const filterStatus = document.getElementById('customer-status-filter');
        if (!userList) return;

        const fetchAndRender = async () => {
            let users = [];

            if (window.supabaseClient) {
                try {
                    let { data: dbUsers, error } = await window.supabaseClient
                        .from('profiles')
                        .select('*')
                        .neq('role', 'admin'); // Exclude administrator rows from customer table

                    if (error) {
                        console.error("Error reading profiles:", error);
                        throw error;
                    }

                    if (dbUsers) {
                        users = dbUsers.map(u => ({
                            id: u.id,
                            fullname: u.fullname,
                            email: u.email,
                            businessName: u.business_name,
                            businessType: u.business_type,
                            phone: u.phone,
                            country: u.country,
                            role: u.role,
                            status: u.status,
                            createdAt: u.created_at
                        }));
                        localStorage.setItem('tc_users', JSON.stringify(users));
                    }
                } catch (err) {
                    console.warn("Exception fetching admin users list, falling back to local storage:", err);
                    users = JSON.parse(localStorage.getItem('tc_users')) || [];
                }
            } else {
                users = JSON.parse(localStorage.getItem('tc_users')) || [];
            }

            try {
                const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
                const filterVal = filterStatus ? filterStatus.value : 'all';

                let filtered = users;

                if (searchVal) {
                    filtered = filtered.filter(u => {
                        const bName = u.businessName || u.business_name || '';
                        return u.fullname.toLowerCase().includes(searchVal) ||
                            (u.email && u.email.toLowerCase().includes(searchVal)) ||
                            bName.toLowerCase().includes(searchVal);
                    });
                }

                if (filterVal !== 'all') {
                    filtered = filtered.filter(u => u.status === filterVal);
                }

                if (filtered.length === 0) {
                    userList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No partners found.</td></tr>';
                    return;
                }

                userList.innerHTML = filtered.map(u => `
                    <tr>
                        <td>
                            <div class="user-info-main">${u.fullname}</div>
                            <div class="user-info-sub">${u.email || ''}</div>
                        </td>
                        <td>
                            <div class="user-info-main">${u.businessName || u.business_name || 'N/A'}</div>
                            <div class="user-info-sub">${u.businessType || u.business_type || 'N/A'} | ${u.country || 'N/A'}</div>
                        </td>
                        <td><span class="badge badge-${u.status}">${u.status}</span></td>
                        <td class="action-btns">
                            <button onclick="B2B_AUTH.viewProfile('${u.id}')" class="btn btn-outline btn-sm" title="View Profile"><i class="fa-solid fa-eye"></i></button>
                            <button onclick="B2B_AUTH.editProfile('${u.id}')" class="btn btn-outline btn-sm" title="Edit Profile"><i class="fa-solid fa-pencil"></i></button>
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
            } catch (err) {
                console.error("Exception rendering admin users list:", err);
            }
        };

        await fetchAndRender();

        if (searchInput && !searchInput.dataset.hasListener) {
            searchInput.dataset.hasListener = 'true';
            searchInput.addEventListener('input', fetchAndRender);
        }
        if (filterStatus && !filterStatus.dataset.hasListener) {
            filterStatus.dataset.hasListener = 'true';
            filterStatus.addEventListener('change', fetchAndRender);
        }
    },

    async viewProfile(userId) {
        let u;
        if (userId === 'admin-001') {
            u = {
                id: 'admin-001',
                fullname: 'System Admin',
                email: 'admin@trendcrafters.us',
                businessName: 'Trend Crafters LLC',
                businessType: 'Internal',
                phone: 'N/A',
                country: 'US',
                status: 'approved',
                createdAt: new Date().toISOString()
            };
        } else {
            if (!window.supabaseClient) return;
            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error || !data) return;
            u = {
                id: data.id,
                fullname: data.fullname,
                email: data.email,
                businessName: data.business_name,
                businessType: data.business_type,
                phone: data.phone,
                country: data.country,
                status: data.status,
                createdAt: data.created_at
            };
        }

        const modal = document.getElementById('customer-modal');
        if (!modal) return;

        document.getElementById('c-name').textContent = u.fullname;
        document.getElementById('c-business').textContent = u.businessName;
        document.getElementById('c-email').textContent = u.email || 'N/A';
        document.getElementById('c-phone').textContent = u.phone;
        document.getElementById('c-country').textContent = u.country;
        document.getElementById('c-type').textContent = u.businessType;
        document.getElementById('c-status').textContent = u.status;
        document.getElementById('c-status').className = `badge badge-${u.status}`;
        document.getElementById('c-date').textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
        
        let ordersCount = 0;
        if (userId !== 'admin-001') {
            try {
                const { count, error: countErr } = await window.supabaseClient
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('customer_id', userId);
                if (!countErr) ordersCount = count;
            } catch (cErr) {
                console.error(cErr);
            }
        }
        document.getElementById('c-orders').textContent = ordersCount;

        modal.style.display = 'flex';
        document.getElementById('edit-c-id').value = u.id;
    },

    closeProfile() {
        const modal = document.getElementById('customer-modal');
        const form = document.getElementById('customer-edit-form');
        if (modal) modal.style.display = 'none';
        if (form) form.style.display = 'none';
    },

    async editProfile(userId) {
        if (userId === 'admin-001') return;
        
        if (!window.supabaseClient) return;
        const { data: u, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error || !u) return;

        document.getElementById('edit-c-id').value = u.id;
        document.getElementById('edit-c-name').value = u.fullname;
        document.getElementById('edit-c-business').value = u.business_name;
        document.getElementById('edit-c-email').value = u.email || '';
        document.getElementById('edit-c-phone').value = u.phone;
        document.getElementById('edit-c-country').value = u.country;
        document.getElementById('edit-c-type').value = u.business_type;

        document.getElementById('customer-edit-form').style.display = 'block';
    },

    async saveCustomerEdit(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('edit-c-id').value;
        if (!id) return;

        const updateData = {
            fullname: document.getElementById('edit-c-name').value,
            business_name: document.getElementById('edit-c-business').value,
            email: document.getElementById('edit-c-email').value,
            phone: document.getElementById('edit-c-phone').value,
            country: document.getElementById('edit-c-country').value,
            business_type: document.getElementById('edit-c-type').value
        };

        if (!window.supabaseClient) return;

        try {
            const { error } = await window.supabaseClient
                .from('profiles')
                .update(updateData)
                .eq('id', id);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            this.renderAdminUsers();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            this.closeProfile();
            showToast('Customer details updated successfully!');
        } catch (err) {
            console.error("Exception saving customer edit:", err);
            showToast("Failed to save changes.", "error");
        }
    },

    async updateStatus(userId, newStatus) {
        if (userId === 'admin-001') return;

        if (!window.supabaseClient) return;

        try {
            const { error } = await window.supabaseClient
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            this.renderAdminUsers();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }

            // Fetch user info for simulation notification
            const { data: user } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (user && typeof B2B_NOTIFY !== 'undefined') {
                if (newStatus === 'approved') B2B_NOTIFY.onApproval(user);
                if (newStatus === 'rejected') B2B_NOTIFY.onRejection(user);
            }
            
            showToast(`User status updated to ${newStatus}`);
        } catch (err) {
            console.error("Exception updating user status:", err);
            showToast("Failed to update user status.", "error");
        }
    }
};

// Initialize on DOMContentLoaded to prevent race conditions with DOM elements and other scripts
document.addEventListener('DOMContentLoaded', () => B2B_AUTH.init());

// Global Logout hook
window.logoutUser = () => B2B_AUTH.logout();

// Global Toast System
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('active'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};
