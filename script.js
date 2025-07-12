// Audiobook progress tracker with audio player
class AudiobookTracker {
    constructor() {
        this.progress = this.loadProgress();
        this.notes = this.loadNotes();
        this.bookmarks = this.loadBookmarks();
        this.audioFiles = {
            1: 'CrimeAndPunishment-FyodorDostoyevskypart1.mp3',
            2: 'CrimeAndPunishment-FyodorDostoyevskypart2.mp3',
            3: 'CrimeAndPunishment-FyodorDostoyevskypart3.mp3'
        };
        this.currentPart = null;
        this.audio = null;
        this.isPlaying = false;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAllProgress();
        this.loadNotes();
        this.setupAudioPlayer();
        this.updateBookmarksDisplay();
        this.updateStatus('Ready to listen');
    }

    setupAudioPlayer() {
        // Setup audio progress slider
        const audioProgressSlider = document.getElementById('audio-progress-slider');
        if (audioProgressSlider) {
            audioProgressSlider.addEventListener('input', (e) => {
                if (this.audio && this.currentPart) {
                    const seekTime = (e.target.value / 100) * this.audio.duration;
                    this.audio.currentTime = seekTime;
                }
            });
        }

        // Setup volume slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                if (this.audio) {
                    this.audio.volume = e.target.value / 100;
                }
            });
        }
    }

    setupEventListeners() {
        // Setup sliders for each part
        for (let i = 1; i <= 3; i++) {
            const slider = document.getElementById(`slider-${i}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.updateProgress(i, parseInt(e.target.value));
                });
            }
        }

        // Load notes on page load
        const notesTextarea = document.getElementById('notes');
        if (notesTextarea) {
            notesTextarea.value = this.notes;
        }
    }

    updateStatus(message) {
        const statusText = document.getElementById('status-indicator');
        if (statusText) {
            const textElement = statusText.querySelector('.status-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    enablePlayerControls() {
        const controls = ['play-pause-btn', 'stop-btn', 'skip-back-btn', 'skip-forward-btn', 'bookmark-btn'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = false;
            }
        });
        
        const audioSlider = document.getElementById('audio-progress-slider');
        if (audioSlider) {
            audioSlider.disabled = false;
        }
    }

    disablePlayerControls() {
        const controls = ['play-pause-btn', 'stop-btn', 'skip-back-btn', 'skip-forward-btn', 'bookmark-btn'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = true;
            }
        });
        
        const audioSlider = document.getElementById('audio-progress-slider');
        if (audioSlider) {
            audioSlider.disabled = true;
        }
    }

    loadAudio(part) {
        if (this.currentPart === part && this.audio) {
            // If same part is already loaded, just play/pause
            this.togglePlayPause();
            return;
        }

        // Stop current audio if playing
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }

        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.currentPart = part;
        const audioFile = this.audioFiles[part];
        
        if (audioFile) {
            this.updateStatus('Loading audio...');
            this.disablePlayerControls();
            
            this.audio = new Audio(audioFile);
            this.audio.volume = document.getElementById('volume-slider')?.value / 100 || 0.7;
            
            // Set up audio event listeners
            this.audio.addEventListener('loadedmetadata', () => {
                this.updateAudioDisplay();
                this.enablePlayerControls();
                this.updateStatus(`Part ${part} loaded`);
                
                // Start from saved progress if available
                const savedProgress = this.progress[part];
                if (savedProgress > 0) {
                    const startTime = (savedProgress / 100) * this.audio.duration;
                    this.audio.currentTime = startTime;
                }
            });

            this.audio.addEventListener('loadstart', () => {
                this.updateStatus('Loading audio file...');
            });

            this.audio.addEventListener('canplay', () => {
                this.updateStatus(`Part ${part} ready to play`);
            });

            this.audio.addEventListener('error', (e) => {
                this.updateStatus('Error loading audio file');
                this.showNotification('Unable to load audio file. Please check if the file exists.');
                console.error('Audio error:', e);
            });

            this.audio.addEventListener('play', () => {
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.startProgressUpdate();
                this.updateStatus(`Playing Part ${part}`);
            });

            this.audio.addEventListener('pause', () => {
                this.isPlaying = false;
                this.updatePlayPauseButton();
                this.stopProgressUpdate();
                this.updateStatus(`Paused - Part ${part}`);
            });

            this.audio.addEventListener('ended', () => {
                this.isPlaying = false;
                this.updatePlayPauseButton();
                this.stopProgressUpdate();
                this.markComplete(part);
                this.updateStatus(`Part ${part} completed`);
            });

            this.audio.addEventListener('timeupdate', () => {
                this.updateAudioDisplay();
                // Auto-save progress every 30 seconds
                if (this.audio.currentTime % 30 < 1) {
                    this.autoSaveProgress();
                }
            });

            // Update track info
            document.getElementById('current-track').textContent = `Part ${part}`;
            
            // Try to play (may be blocked by browser)
            this.audio.play().catch(error => {
                console.log('Auto-play was prevented:', error);
                this.updateStatus('Click Play to start listening');
                this.showNotification('Click the Play button to start listening');
            });
        }
    }

    togglePlayPause() {
        if (!this.audio) return;

        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(error => {
                console.log('Play failed:', error);
                this.showNotification('Unable to play audio. Please check the file.');
                this.updateStatus('Playback error');
            });
        }
    }

    stopAudio() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            this.updatePlayPauseButton();
            this.stopProgressUpdate();
            this.updateStatus('Stopped');
        }
    }

    skipForward() {
        if (this.audio) {
            this.audio.currentTime = Math.min(this.audio.currentTime + 30, this.audio.duration);
        }
    }

    skipBack() {
        if (this.audio) {
            this.audio.currentTime = Math.max(this.audio.currentTime - 30, 0);
        }
    }

    addBookmark() {
        if (!this.audio || !this.currentPart) {
            this.showNotification('Please load an audio file first');
            return;
        }

        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        const percentage = Math.round((currentTime / duration) * 100);
        
        const bookmarkName = prompt(`Add bookmark at ${this.formatTime(currentTime)} (${percentage}%):`);
        if (bookmarkName && bookmarkName.trim()) {
            const bookmark = {
                part: this.currentPart,
                time: currentTime,
                percentage: percentage,
                name: bookmarkName.trim(),
                timestamp: Date.now()
            };

            if (!this.bookmarks[this.currentPart]) {
                this.bookmarks[this.currentPart] = [];
            }
            this.bookmarks[this.currentPart].push(bookmark);
            this.saveBookmarks();
            this.updateBookmarksDisplay();
            this.showNotification(`Bookmark "${bookmarkName}" added!`);
        }
    }

    jumpToBookmark(bookmark) {
        if (this.audio && this.currentPart === bookmark.part) {
            this.audio.currentTime = bookmark.time;
            this.showNotification(`Jumped to: ${bookmark.name}`);
        } else {
            // Load the correct part and jump to bookmark
            this.loadAudio(bookmark.part);
            setTimeout(() => {
                if (this.audio) {
                    this.audio.currentTime = bookmark.time;
                    this.showNotification(`Jumped to: ${bookmark.name}`);
                }
            }, 1000);
        }
    }

    deleteBookmark(part, index) {
        if (this.bookmarks[part] && this.bookmarks[part][index]) {
            const bookmarkName = this.bookmarks[part][index].name;
            this.bookmarks[part].splice(index, 1);
            this.saveBookmarks();
            this.updateBookmarksDisplay();
            this.showNotification(`Bookmark "${bookmarkName}" deleted!`);
        }
    }

    updateBookmarksDisplay() {
        const bookmarksContainer = document.getElementById('bookmarks-container');
        const emptyBookmarks = document.getElementById('empty-bookmarks');
        
        if (!bookmarksContainer) return;

        bookmarksContainer.innerHTML = '';
        
        let hasBookmarks = false;
        
        for (let part = 1; part <= 3; part++) {
            if (this.bookmarks[part] && this.bookmarks[part].length > 0) {
                hasBookmarks = true;
                const partBookmarks = this.bookmarks[part];
                partBookmarks.sort((a, b) => a.time - b.time);
                
                const partDiv = document.createElement('div');
                partDiv.className = 'bookmark-part';
                partDiv.innerHTML = `<h4>Part ${part} Bookmarks</h4>`;
                
                partBookmarks.forEach((bookmark, index) => {
                    const bookmarkDiv = document.createElement('div');
                    bookmarkDiv.className = 'bookmark-item';
                    bookmarkDiv.innerHTML = `
                        <span class="bookmark-name">${bookmark.name}</span>
                        <span class="bookmark-time">${this.formatTime(bookmark.time)} (${bookmark.percentage}%)</span>
                        <div class="bookmark-actions">
                            <button class="btn btn-small" onclick="jumpToBookmark(${JSON.stringify(bookmark).replace(/"/g, '&quot;')})">▶️</button>
                            <button class="btn btn-small btn-danger" onclick="deleteBookmark(${part}, ${index})">🗑️</button>
                        </div>
                    `;
                    partDiv.appendChild(bookmarkDiv);
                });
                
                bookmarksContainer.appendChild(partDiv);
            }
        }
        
        // Show empty state if no bookmarks
        if (!hasBookmarks) {
            bookmarksContainer.innerHTML = `
                <div class="empty-state" id="empty-bookmarks">
                    <span>📚 No bookmarks yet</span>
                    <p>Add bookmarks while listening to mark important moments</p>
                </div>
            `;
        }
    }

    updateAudioDisplay() {
        if (!this.audio) return;

        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            const audioProgressSlider = document.getElementById('audio-progress-slider');
            if (audioProgressSlider) {
                audioProgressSlider.value = progressPercent;
            }

            // Update time display
            document.getElementById('current-time').textContent = this.formatTime(currentTime);
            document.getElementById('total-time').textContent = this.formatTime(duration);
        }
    }

    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            if (this.isPlaying) {
                playPauseBtn.innerHTML = '⏸️ Pause';
                playPauseBtn.classList.remove('btn-primary');
                playPauseBtn.classList.add('btn-secondary');
            } else {
                playPauseBtn.innerHTML = '▶️ Play';
                playPauseBtn.classList.remove('btn-secondary');
                playPauseBtn.classList.add('btn-primary');
            }
        }
    }

    startProgressUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateAudioDisplay();
        }, 1000);
    }

    stopProgressUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    autoSaveProgress() {
        if (this.audio && this.currentPart) {
            const progressPercent = (this.audio.currentTime / this.audio.duration) * 100;
            this.updateProgress(this.currentPart, progressPercent);
        }
    }

    updateProgress(part, percentage) {
        // Ensure percentage is between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));
        this.progress[part] = percentage;
        this.saveProgress();
        this.updateProgressDisplay(part);
        this.updateOverallProgress();
    }

    updateProgressDisplay(part) {
        const progressFill = document.getElementById(`progress-${part}`);
        const progressText = document.getElementById(`progress-text-${part}`);
        const timeRemaining = document.getElementById(`time-remaining-${part}`);
        const slider = document.getElementById(`slider-${part}`);

        if (progressFill && progressText && timeRemaining && slider) {
            const percentage = Math.round(this.progress[part]); // Round to whole number
            
            // Update progress bar
            progressFill.style.width = `${percentage}%`;
            
            // Update text
            progressText.textContent = `${percentage}% complete`;
            
            // Update slider
            slider.value = percentage;
            
            // Calculate time remaining (assuming 6 hours per part)
            const totalMinutes = 6 * 60; // 6 hours in minutes
            const completedMinutes = (percentage / 100) * totalMinutes;
            const remainingMinutes = totalMinutes - completedMinutes;
            
            const remainingHours = Math.floor(remainingMinutes / 60);
            const remainingMins = Math.floor(remainingMinutes % 60);
            
            if (remainingHours > 0) {
                timeRemaining.textContent = `${remainingHours}h ${remainingMins}m remaining`;
            } else {
                timeRemaining.textContent = `${remainingMins}m remaining`;
            }
        }
    }

    updateOverallProgress() {
        const totalProgress = (this.progress[1] + this.progress[2] + this.progress[3]) / 3;
        const overallProgressFill = document.getElementById('overall-progress-fill');
        const overallProgressText = document.getElementById('overall-progress-text');
        
        if (overallProgressFill && overallProgressText) {
            overallProgressFill.style.width = `${totalProgress}%`;
            overallProgressText.textContent = `${Math.round(totalProgress)}% of the entire book completed`;
        }
    }

    updateAllProgress() {
        for (let i = 1; i <= 3; i++) {
            this.updateProgressDisplay(i);
        }
        this.updateOverallProgress();
    }

    markComplete(part) {
        this.updateProgress(part, 100);
        this.showNotification(`Part ${part} marked as complete!`);
    }

    saveProgress() {
        localStorage.setItem('audiobookProgress', JSON.stringify(this.progress));
    }

    loadProgress() {
        const saved = localStorage.getItem('audiobookProgress');
        return saved ? JSON.parse(saved) : { 1: 0, 2: 0, 3: 0 };
    }

    saveBookmarks() {
        localStorage.setItem('audiobookBookmarks', JSON.stringify(this.bookmarks));
    }

    loadBookmarks() {
        const saved = localStorage.getItem('audiobookBookmarks');
        return saved ? JSON.parse(saved) : {};
    }

    saveNotes() {
        const notesTextarea = document.getElementById('notes');
        if (notesTextarea) {
            this.notes = notesTextarea.value;
            localStorage.setItem('audiobookNotes', this.notes);
            this.showNotification('Notes saved successfully!');
        }
    }

    loadNotes() {
        const saved = localStorage.getItem('audiobookNotes');
        this.notes = saved || '';
        return this.notes;
    }

    showNotification(message) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            document.body.removeChild(notification);
        });

        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Utility function to format time
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Global functions for HTML onclick handlers
function loadAudio(part) {
    tracker.loadAudio(part);
}

function togglePlayPause() {
    tracker.togglePlayPause();
}

function stopAudio() {
    tracker.stopAudio();
}

function skipForward() {
    tracker.skipForward();
}

function skipBack() {
    tracker.skipBack();
}

function addBookmark() {
    tracker.addBookmark();
}

function jumpToBookmark(bookmark) {
    tracker.jumpToBookmark(bookmark);
}

function deleteBookmark(part, index) {
    tracker.deleteBookmark(part, index);
}

function markComplete(part) {
    tracker.markComplete(part);
}

function saveNotes() {
    tracker.saveNotes();
}

// Initialize the tracker when the page loads
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new AudiobookTracker();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                loadAudio(1);
                break;
            case '2':
                e.preventDefault();
                loadAudio(2);
                break;
            case '3':
                e.preventDefault();
                loadAudio(3);
                break;
            case 's':
                e.preventDefault();
                saveNotes();
                break;
            case 'b':
                e.preventDefault();
                addBookmark();
                break;
        }
    } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipForward();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBack();
    }
});

// Add some helpful tips
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        tracker.showNotification('💡 Tip: Use Ctrl+B to add bookmarks, Space to play/pause');
    }, 2000);
}); 