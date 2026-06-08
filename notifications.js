/**
 * Trend Crafters - Email Notification System (Simulation)
 * In a production environment, these functions would call a backend API (Node.js/PHP)
 * or a service like EmailJS / SendGrid.
 */

const B2B_NOTIFY = {
    // Mock Admin Email
    ADMIN_EMAIL: 'admin@trendcrafters.us',

    sendEmail(to, subject, body, type = 'info') {
        console.log(`%c[EMAIL SENT] To: ${to} | Subject: ${subject}`, 'color: #c5a059; font-weight: bold;');
        console.log(`Body: ${body}`);
        
        // Show a visual toast notification to the admin/user in the UI
        this.showToast(`Email sent to ${to}: ${subject}`, type);
    },

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'success' ? '#10b981' : '#1e293b'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-size: 0.9rem;
            animation: slideIn 0.3s ease-out;
        `;
        toast.innerHTML = `<i class="fa-solid fa-envelope" style="margin-right: 0.5rem;"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    },

    // 1. User Signup
    onSignup(user) {
        // To Admin
        this.sendEmail(this.ADMIN_EMAIL, 'New account approval request', 
            `New partner registration: ${user.fullname} from ${user.businessName}. Please review in dashboard.`);
        
        // To User
        this.sendEmail(user.email, 'Your account is pending approval', 
            `Hi ${user.fullname}, thank you for registering with Trend Crafters. Our team is verifying your details.`);
    },

    // 2. Account Approval
    onApproval(user) {
        const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
        this.sendEmail(user.email, 'Your Trend Crafters account has been approved', 
            `Congratulations! Your wholesale account is now active. Log in to view products: ${baseUrl}/login.html`, 'success');
    },

    // 3. Account Rejection
    onRejection(user) {
        this.sendEmail(user.email, 'Your account request was not approved', 
            `Hi ${user.fullname}, unfortunately we cannot approve your wholesale account at this time. Contact support for details.`);
    },

    // 4. Order Generation
    onOrderGenerated(order, customer, product) {
        const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
        const link = `${baseUrl}/${order.checkoutUrl}`;
        const body = `
            Hi ${customer.fullname},
            
            Your custom wholesale order for ${product ? product.name : 'Selection'} has been generated.
            
            Order ID: #${order.id}
            Quantity: ${order.quantity} units
            Total Amount: $${parseFloat(order.total).toFixed(2)}
            
            Complete your payment here: ${link}
            
            Best regards,
            Trend Crafters Team
        `;
        this.sendEmail(customer.email, `Your Wholesale Order #${order.id} is Ready`, body, 'success');
    }
};

// Add CSS for toast animation if not exists
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
