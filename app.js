// Timeblock Application
class TimeblockApp {
    constructor() {
        this.timeblocks = [];
        this.isDragging = false;
        this.dragStart = null;
        this.dragPreview = null;
        this.timelineGrid = document.getElementById('timeline-grid');
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.renderTimeline();
        this.renderTimeblocks();
        this.updateAnalytics();
        this.setupEventListeners();
    }

    // Generate timeline with 15-minute intervals (96 slots for 24 hours)
    renderTimeline() {
        const labels = document.getElementById('timeline-labels');
        const grid = this.timelineGrid;
        
        // Clear existing content
        labels.innerHTML = '';
        grid.innerHTML = '';

        // Create time labels and slots
        for (let hour = 0; hour < 24; hour++) {
            // Add hour label
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = this.formatTime(hour, 0);
            labels.appendChild(label);

            // Add 4 slots for this hour (15-min intervals)
            for (let quarter = 0; quarter < 4; quarter++) {
                const slot = document.createElement('div');
                slot.className = 'timeline-slot';
                slot.dataset.time = hour * 60 + quarter * 15; // time in minutes
                grid.appendChild(slot);
            }
        }
    }

    // Format time as HH:MM
    formatTime(hours, minutes) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Convert minutes to time string
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return this.formatTime(hours, mins);
    }

    // Calculate position in pixels for a given time in minutes
    getPositionForTime(minutes) {
        // Each 15-minute slot is 15px tall
        return (minutes / 15) * 15;
    }

    // Calculate time in minutes for a given Y position
    getTimeForPosition(y) {
        const rect = this.timelineGrid.getBoundingClientRect();
        const relativeY = y - rect.top + this.timelineGrid.scrollTop;
        // Snap to 15-minute intervals
        const minutes = Math.floor(relativeY / 15) * 15;
        return Math.max(0, Math.min(1425, minutes)); // Clamp between 0 and 23:45
    }

    setupEventListeners() {
        // Mouse down to start dragging
        this.timelineGrid.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('timeblock')) {
                // Clicking on existing timeblock - delete it
                this.deleteTimeblock(e.target.dataset.id);
                return;
            }

            if (e.target === this.timelineGrid || e.target.classList.contains('timeline-slot')) {
                this.startDrag(e);
            }
        });

        // Mouse move to update drag preview
        this.timelineGrid.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.updateDragPreview(e);
            }
        });

        // Mouse up to finish dragging
        this.timelineGrid.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.endDrag(e);
            }
        });

        // Mouse leave to cancel dragging
        this.timelineGrid.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.cancelDrag();
            }
        });
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragStart = this.getTimeForPosition(e.clientY);
        
        // Create drag preview
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';
        this.timelineGrid.appendChild(this.dragPreview);
    }

    updateDragPreview(e) {
        if (!this.dragPreview) return;

        const currentTime = this.getTimeForPosition(e.clientY);
        const startTime = Math.min(this.dragStart, currentTime);
        const endTime = Math.max(this.dragStart, currentTime);

        const top = this.getPositionForTime(startTime);
        const height = this.getPositionForTime(endTime - startTime);

        this.dragPreview.style.top = `${top}px`;
        this.dragPreview.style.height = `${Math.max(15, height)}px`; // Minimum 15px (15 minutes)
    }

    endDrag(e) {
        if (!this.isDragging || !this.dragPreview) return;

        const endTime = this.getTimeForPosition(e.clientY);
        const startTime = Math.min(this.dragStart, endTime);
        const finalEndTime = Math.max(this.dragStart, endTime);

        // Only create if at least 15 minutes
        if (finalEndTime - startTime >= 15) {
            this.createTimeblock(startTime, finalEndTime);
        }

        this.cancelDrag();
    }

    cancelDrag() {
        this.isDragging = false;
        this.dragStart = null;
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
    }

    createTimeblock(startMinutes, endMinutes) {
        const timeblock = {
            id: Date.now().toString(),
            start: startMinutes,
            end: endMinutes
        };

        this.timeblocks.push(timeblock);
        this.saveToStorage();
        this.renderTimeblocks();
        this.updateAnalytics();
    }

    deleteTimeblock(id) {
        this.timeblocks = this.timeblocks.filter(block => block.id !== id);
        this.saveToStorage();
        this.renderTimeblocks();
        this.updateAnalytics();
    }

    renderTimeblocks() {
        // Remove existing timeblocks
        const existingBlocks = this.timelineGrid.querySelectorAll('.timeblock');
        existingBlocks.forEach(block => block.remove());

        // Render all timeblocks
        this.timeblocks.forEach(block => {
            const element = document.createElement('div');
            element.className = 'timeblock';
            element.dataset.id = block.id;

            const top = this.getPositionForTime(block.start);
            const height = this.getPositionForTime(block.end - block.start);

            element.style.top = `${top}px`;
            element.style.height = `${height}px`;

            const duration = (block.end - block.start) / 60;
            const timeRange = `${this.minutesToTime(block.start)} - ${this.minutesToTime(block.end)}`;

            element.innerHTML = `
                <div class="timeblock-time">${timeRange}</div>
                <div class="timeblock-duration">${duration.toFixed(2)} hours</div>
            `;

            this.timelineGrid.appendChild(element);
        });
    }

    updateAnalytics() {
        const totalMinutes = this.timeblocks.reduce((sum, block) => {
            return sum + (block.end - block.start);
        }, 0);

        const totalHours = totalMinutes / 60;
        const blockCount = this.timeblocks.length;
        const avgDuration = blockCount > 0 ? totalHours / blockCount : 0;

        document.getElementById('total-hours').textContent = totalHours.toFixed(1);
        document.getElementById('block-count').textContent = blockCount;
        document.getElementById('avg-duration').textContent = avgDuration.toFixed(1);
    }

    saveToStorage() {
        localStorage.setItem('timeblocks', JSON.stringify(this.timeblocks));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('timeblocks');
        if (stored) {
            try {
                this.timeblocks = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading timeblocks:', e);
                this.timeblocks = [];
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TimeblockApp();
});
