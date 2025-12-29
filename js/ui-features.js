/**
 * FamilyGoals - UI Features Module
 * Pull-to-refresh, Toast notifications, Charts, Skeleton loading
 */

// ============================================
// TOAST NOTIFICATIONS
// ============================================
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(options) {
        const { type = 'info', title, message, duration = 4000 } = options;

        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="Toast.dismiss(this.parentElement)">✕</button>
        `;

        this.container.appendChild(toast);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    dismiss(toast) {
        if (!toast || !toast.parentElement) return;
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    },

    success(title, message) {
        return this.show({ type: 'success', title, message });
    },

    warning(title, message) {
        return this.show({ type: 'warning', title, message });
    },

    error(title, message) {
        return this.show({ type: 'error', title, message });
    },

    info(title, message) {
        return this.show({ type: 'info', title, message });
    }
};

// ============================================
// PULL-TO-REFRESH
// ============================================
const PullToRefresh = {
    indicator: null,
    startY: 0,
    pulling: false,
    threshold: 80,

    init() {
        this.indicator = document.getElementById('pull-indicator');
        this.bindEvents();
    },

    bindEvents() {
        let touchStartY = 0;
        let touchCurrentY = 0;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                touchStartY = e.touches[0].clientY;
                this.pulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.pulling) return;

            touchCurrentY = e.touches[0].clientY;
            const diff = touchCurrentY - touchStartY;

            if (diff > 0 && window.scrollY === 0) {
                const pullDistance = Math.min(diff * 0.5, 100);
                this.indicator.style.transform = `translateX(-50%) translateY(${pullDistance - 40}px)`;

                if (pullDistance > 20) {
                    this.indicator.classList.add('visible');
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!this.pulling) return;

            const currentTransform = getComputedStyle(this.indicator).transform;
            const matrix = new DOMMatrix(currentTransform);
            const currentY = matrix.m42;

            if (currentY > this.threshold - 40) {
                this.refresh();
            } else {
                this.reset();
            }

            this.pulling = false;
        });
    },

    refresh() {
        this.indicator.classList.add('loading');
        this.indicator.style.transform = 'translateX(-50%) translateY(20px)';

        // Simulate refresh
        setTimeout(() => {
            // Trigger data reload
            if (typeof app !== 'undefined' && app.renderAll) {
                app.renderAll();
            }

            Toast.success('Odświeżono', 'Dane zostały zaktualizowane');
            this.reset();
            this.updateSyncTime();
        }, 1000);
    },

    reset() {
        this.indicator.classList.remove('visible', 'loading');
        this.indicator.style.transform = 'translateX(-50%) translateY(-60px)';
    },

    updateSyncTime() {
        const el = document.getElementById('last-sync-time');
        if (el) {
            const now = new Date();
            const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            el.textContent = `Ostatnia aktualizacja: dziś, ${time}`;
        }
    }
};

// ============================================
// SKELETON LOADING
// ============================================
const Skeleton = {
    show(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton skeleton-bar"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton skeleton-bar"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        `;
    },

    showList(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="list-item" style="pointer-events: none;">
                    <div class="skeleton skeleton-circle"></div>
                    <div class="list-content" style="flex: 1;">
                        <div class="skeleton skeleton-text medium"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                    <div class="skeleton skeleton-amount"></div>
                </div>
            `;
        }
        container.innerHTML = html;
    },

    hide(containerId) {
        // Content will be replaced by actual data
    }
};

// ============================================
// PIE CHART FOR EXPENSES
// ============================================
const ExpenseChart = {
    colors: {
        housing: '#b8a9d9',    // lavender
        food: '#7ecdb0',       // mint
        transport: '#ffb5a7',  // peach
        children: '#e8b86d',   // warning/yellow
        health: '#e07878',     // danger/red
        entertainment: '#9a8c7f', // muted
        education: '#5cb585',  // success
        clothing: '#b8a9d9',   // lavender
        hygiene: '#7ecdb0',    // mint
        gifts: '#ffb5a7',      // peach
        savings: '#5cb585',    // success
        other: '#9a8c7f'       // muted
    },

    categoryNames: {
        housing: 'Mieszkanie',
        food: 'Jedzenie',
        transport: 'Transport',
        children: 'Dzieci',
        health: 'Zdrowie',
        entertainment: 'Rozrywka',
        education: 'Edukacja',
        clothing: 'Ubrania',
        hygiene: 'Higiena',
        gifts: 'Prezenty',
        savings: 'Oszczędności',
        other: 'Inne'
    },

    render(expenses) {
        const container = document.getElementById('expense-chart-container');
        const pieChart = document.getElementById('pie-chart');
        const legend = document.getElementById('chart-legend');
        const totalEl = document.getElementById('total-expenses');

        if (!container || !expenses || expenses.length === 0) {
            if (container) {
                container.style.display = 'none';
            }
            return;
        }

        container.style.display = 'block';

        // Group by category
        const byCategory = {};
        let total = 0;

        expenses.forEach(exp => {
            const cat = exp.category || 'other';
            byCategory[cat] = (byCategory[cat] || 0) + exp.amount;
            total += exp.amount;
        });

        // Sort by amount
        const sorted = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6); // Top 6 categories

        // Update total
        totalEl.textContent = this.formatMoney(total);

        // Build SVG pie chart
        const svg = pieChart.querySelector('svg');
        svg.innerHTML = '';

        const circumference = 2 * Math.PI * 34; // radius = 34
        let offset = 0;

        sorted.forEach(([cat, amount]) => {
            const percent = amount / total;
            const dashLength = circumference * percent;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '34');
            circle.setAttribute('stroke', this.colors[cat] || '#9a8c7f');
            circle.setAttribute('stroke-dasharray', `${dashLength} ${circumference}`);
            circle.setAttribute('stroke-dashoffset', -offset);
            circle.style.transition = 'all 0.5s ease-out';

            svg.appendChild(circle);
            offset += dashLength;
        });

        // Build legend
        legend.innerHTML = sorted.map(([cat, amount]) => `
            <div class="legend-item">
                <span class="legend-dot" style="background: ${this.colors[cat] || '#9a8c7f'}"></span>
                <span>${this.categoryNames[cat] || cat}</span>
                <span style="margin-left: auto; font-weight: 600;">${this.formatMoney(amount)}</span>
            </div>
        `).join('');
    },

    formatMoney(amount) {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('PLN', 'zł');
    }
};

// ============================================
// TIMELINE CHART
// ============================================
const TimelineChart = {
    render(data) {
        const container = document.getElementById('timeline-chart');
        if (!container || !data || data.length === 0) return;

        const maxValue = Math.max(...data.map(d => d.value));
        const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

        container.innerHTML = data.slice(-6).map((d, i, arr) => {
            const height = Math.max(10, (d.value / maxValue) * 100);
            const isLast = i === arr.length - 1;
            const monthName = months[d.month] || months[i];
            const valueK = Math.round(d.value / 1000);

            return `
                <div class="timeline-bar">
                    <div class="timeline-bar-fill ${isLast ? 'current' : ''}" style="height: ${height}%">
                        <span class="bar-value">${valueK}k</span>
                    </div>
                    <span class="timeline-bar-label">${monthName}</span>
                </div>
            `;
        }).join('');
    },

    generateSampleData() {
        const now = new Date();
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const month = (now.getMonth() - i + 12) % 12;
            data.push({
                month,
                value: 8000 + Math.random() * 4000
            });
        }

        return data;
    }
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================
const Notifications = {
    items: [],

    init() {
        this.load();
        this.updateBadge();
    },

    load() {
        try {
            this.items = JSON.parse(localStorage.getItem('fg_notifications') || '[]');
        } catch (e) {
            this.items = [];
        }
    },

    save() {
        localStorage.setItem('fg_notifications', JSON.stringify(this.items));
    },

    add(notification) {
        this.items.unshift({
            id: Date.now(),
            ...notification,
            read: false,
            timestamp: new Date().toISOString()
        });
        this.save();
        this.updateBadge();

        // Show toast
        Toast.info(notification.title, notification.message);
    },

    markAsRead(id) {
        const item = this.items.find(n => n.id === id);
        if (item) {
            item.read = true;
            this.save();
            this.updateBadge();
        }
    },

    markAllAsRead() {
        this.items.forEach(n => n.read = true);
        this.save();
        this.updateBadge();
    },

    getUnreadCount() {
        return this.items.filter(n => !n.read).length;
    },

    updateBadge() {
        const count = this.getUnreadCount();
        const existingBadges = document.querySelectorAll('.notification-badge');
        existingBadges.forEach(b => b.remove());

        if (count > 0) {
            // Add badge to achievements nav item (or create notifications tab)
            const navItems = document.querySelectorAll('.nav-item');
            if (navItems.length >= 4) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = count > 9 ? '9+' : count;
                navItems[3].appendChild(badge);
            }
        }
    },

    // Check for notifications to send
    checkScheduled() {
        // Check for upcoming goals
        if (typeof DataManager !== 'undefined') {
            const goals = DataManager.getGoals();
            const now = new Date();

            goals.forEach(goal => {
                if (goal.deadline) {
                    const deadline = new Date(goal.deadline);
                    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

                    if (daysLeft === 30 || daysLeft === 7 || daysLeft === 1) {
                        const existing = this.items.find(n =>
                            n.goalId === goal.id && n.daysLeft === daysLeft
                        );

                        if (!existing) {
                            this.add({
                                type: 'goal_reminder',
                                goalId: goal.id,
                                daysLeft,
                                icon: '🎯',
                                title: `Cel: ${goal.name}`,
                                message: `Zostało ${daysLeft} dni do terminu!`
                            });
                        }
                    }
                }
            });
        }
    }
};

// ============================================
// WIDGET DATA
// ============================================
const Widget = {
    getData() {
        if (typeof DataManager === 'undefined') {
            return {
                savingsRequired: 0,
                savingsDone: 0,
                progress: 0
            };
        }

        const goals = DataManager.getGoals();
        const income = DataManager.getIncome();

        let monthlyRequired = 0;
        goals.forEach(g => {
            if (g.monthlyAmount) {
                monthlyRequired += g.monthlyAmount;
            }
        });

        let totalIncome = 0;
        income.forEach(i => {
            if (i.received) {
                totalIncome += i.amount;
            }
        });

        const progress = monthlyRequired > 0
            ? Math.min(100, Math.round((totalIncome / monthlyRequired) * 100))
            : 0;

        return {
            savingsRequired: monthlyRequired,
            savingsDone: totalIncome,
            progress
        };
    },

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const data = this.getData();

        container.innerHTML = `
            <div class="widget-preview">
                <div class="widget-header">📊 FamilyGoals Widget</div>
                <div class="widget-value">${this.formatMoney(data.savingsDone)}</div>
                <div class="widget-label">z ${this.formatMoney(data.savingsRequired)} do odłożenia</div>
                <div class="widget-progress">
                    <div class="widget-progress-fill" style="width: ${data.progress}%"></div>
                </div>
                <div class="widget-footer">
                    <span>${data.progress}% celu</span>
                    <span>Zostało: ${this.formatMoney(data.savingsRequired - data.savingsDone)}</span>
                </div>
            </div>
        `;
    },

    formatMoney(amount) {
        return new Intl.NumberFormat('pl-PL', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount) + ' zł';
    }
};

// ============================================
// INITIALIZE ALL FEATURES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    PullToRefresh.init();
    Notifications.init();

    // Update sync time on load
    PullToRefresh.updateSyncTime();

    // Render sample timeline
    TimelineChart.render(TimelineChart.generateSampleData());

    // Check for scheduled notifications
    setTimeout(() => {
        Notifications.checkScheduled();
    }, 2000);
});

// Export for use in other modules
window.Toast = Toast;
window.PullToRefresh = PullToRefresh;
window.Skeleton = Skeleton;
window.ExpenseChart = ExpenseChart;
window.TimelineChart = TimelineChart;
window.Notifications = Notifications;
window.Widget = Widget;
