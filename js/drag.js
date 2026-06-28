/**
 * drag.js — 拖拽功能（修复 passive 警告）
 */

(function() {
    'use strict';

    let dragState = null;

    function setupDrag(btn, type) {
        let clone = null;
        let isDragging = false;

        btn.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            isDragging = true;
            const typeMap = { meat: 'meat', veg: 'veg', rice: 'rice' };
            const t = typeMap[type];
            clone = document.createElement('div');
            clone.className = `drag-clone ${t}-clone`;
            clone.style.position = 'fixed';
            clone.style.pointerEvents = 'none';
            clone.style.zIndex = '9999';
            clone.style.left = e.clientX + 'px';
            clone.style.top = e.clientY + 'px';
            clone.style.transform = 'translate(-50%, -50%) scale(1.08)';
            const label = this.textContent.trim();
            clone.innerHTML = `<span class="indicator"></span> ${label}`;
            document.body.appendChild(clone);
            dragState = { type: t };
            this.style.opacity = '0.4';
            this.style.transform = 'scale(0.9)';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging || !clone) return;
            clone.style.left = e.clientX + 'px';
            clone.style.top = e.clientY + 'px';
            const el = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.day-cell.drag-over').forEach(el2 => {
                if (el2 !== el || !el || !el.classList.contains('day-cell')) {
                    el2.classList.remove('drag-over');
                }
            });
            if (el && el.classList && el.classList.contains('day-cell') && !el.classList.contains('empty')) {
                el.classList.add('drag-over');
            }
        });

        document.addEventListener('mouseup', function(e) {
            if (!isDragging) return;
            isDragging = false;
            if (clone && clone.parentNode) document.body.removeChild(clone);
            clone = null;
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';

            const el = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.day-cell.drag-over').forEach(el2 => el2.classList.remove('drag-over'));

            if (dragState && el && el.classList && el.classList.contains('day-cell') && !el.classList.contains('empty')) {
                const dateStr = el.dataset.date;
                if (dateStr) {
                    const parts = dateStr.split('-').map(Number);
                    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

                    if (window.__vacation && window.__vacation.isVacation(targetDate)) {
                        const app = window.__app;
                        if (app) app.showToast('🏖️ 该日为休假日期，不可拖拽');
                        dragState = null;
                        return;
                    }

                    const { type: t } = dragState;
                    const app = window.__app;
                    if (app) {
                        app.setMark(targetDate, t, true);
                        el.classList.add('drag-over-success');
                        setTimeout(() => el.classList.remove('drag-over-success'), 400);
                        app.setSelectedDate(targetDate);
                        const typeNames = { meat: '肉类', veg: '蔬菜', rice: '米饭' };
                        app.showToast(`✅ 已添加 ${typeNames[t]}`);
                    }
                }
            }
            dragState = null;
        });

        // ----- 手机触控拖拽 -----
        let touchClone = null;
        let touchDragType = null;
        let longPressTimer = null;

        btn.addEventListener('touchstart', function(e) {
            const touch = e.touches[0];
            const typeMap = { meat: 'meat', veg: 'veg', rice: 'rice' };
            touchDragType = typeMap[type];
            longPressTimer = setTimeout(() => {
                touchClone = document.createElement('div');
                touchClone.className = `drag-clone ${touchDragType}-clone`;
                touchClone.style.position = 'fixed';
                touchClone.style.pointerEvents = 'none';
                touchClone.style.zIndex = '9999';
                touchClone.style.left = touch.clientX + 'px';
                touchClone.style.top = touch.clientY + 'px';
                touchClone.style.transform = 'translate(-50%, -50%) scale(1.08)';
                const label = btn.textContent.trim();
                touchClone.innerHTML = `<span class="indicator"></span> ${label}`;
                document.body.appendChild(touchClone);
                dragState = { type: touchDragType };
                btn.style.opacity = '0.4';
                btn.style.transform = 'scale(0.9)';
                if (navigator.vibrate) navigator.vibrate(10);
            }, 300);
        }, { passive: true });

        btn.addEventListener('touchmove', function(e) {
            const touch = e.touches[0];
            if (touchClone) {
                touchClone.style.left = touch.clientX + 'px';
                touchClone.style.top = touch.clientY + 'px';
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                document.querySelectorAll('.day-cell.drag-over').forEach(el2 => {
                    if (el2 !== el || !el || !el.classList.contains('day-cell')) {
                        el2.classList.remove('drag-over');
                    }
                });
                if (el && el.classList && el.classList.contains('day-cell') && !el.classList.contains('empty')) {
                    el.classList.add('drag-over');
                }
            }
        }, { passive: true });

        btn.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);
            if (touchClone && touchClone.parentNode) document.body.removeChild(touchClone);
            touchClone = null;
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';

            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            document.querySelectorAll('.day-cell.drag-over').forEach(el2 => el2.classList.remove('drag-over'));

            if (dragState && el && el.classList && el.classList.contains('day-cell') && !el.classList.contains('empty')) {
                const dateStr = el.dataset.date;
                if (dateStr) {
                    const parts = dateStr.split('-').map(Number);
                    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

                    if (window.__vacation && window.__vacation.isVacation(targetDate)) {
                        const app = window.__app;
                        if (app) app.showToast('🏖️ 该日为休假日期，不可拖拽');
                        dragState = null;
                        return;
                    }

                    const { type: t } = dragState;
                    const app = window.__app;
                    if (app) {
                        app.setMark(targetDate, t, true);
                        el.classList.add('drag-over-success');
                        setTimeout(() => el.classList.remove('drag-over-success'), 400);
                        app.setSelectedDate(targetDate);
                        if (navigator.vibrate) navigator.vibrate(10);
                        const typeNames = { meat: '肉类', veg: '蔬菜', rice: '米饭' };
                        app.showToast(`✅ 已添加 ${typeNames[t]}`);
                    }
                }
            }
            dragState = null;
        }, { passive: true });

        btn.addEventListener('touchcancel', function(e) {
            clearTimeout(longPressTimer);
            if (touchClone && touchClone.parentNode) document.body.removeChild(touchClone);
            touchClone = null;
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
            dragState = null;
            document.querySelectorAll('.day-cell.drag-over').forEach(el2 => el2.classList.remove('drag-over'));
        }, { passive: true });
    }

    function bindDragToCells() {
        document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
            if (cell._dragBound) return;
            cell._dragBound = true;

            cell.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (dragState) this.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
                this.classList.remove('drag-over-success');
            });

            cell.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                if (!dragState) return;

                const dateStr = this.dataset.date;
                if (!dateStr) return;

                const parts = dateStr.split('-').map(Number);
                const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

                if (window.__vacation && window.__vacation.isVacation(targetDate)) {
                    const app = window.__app;
                    if (app) app.showToast('🏖️ 该日为休假日期，不可拖拽');
                    return;
                }

                const { type: t } = dragState;
                const app = window.__app;
                if (app) {
                    app.setMark(targetDate, t, true);
                    this.classList.add('drag-over-success');
                    setTimeout(() => this.classList.remove('drag-over-success'), 400);
                    app.setSelectedDate(targetDate);
                    const typeNames = { meat: '肉类', veg: '蔬菜', rice: '米饭' };
                    app.showToast(`✅ 已添加 ${typeNames[t]}`);
                }
            });
        });
    }

    // ✅ 修复：移除 passive: true，因为不需要在这里 preventDefault
    // 改为使用 capture 阶段或干脆不加 passive
    function initDrag() {
        const meatBtn = document.getElementById('meatBtn');
        const vegBtn = document.getElementById('vegBtn');
        const riceBtn = document.getElementById('riceBtn');

        if (meatBtn) setupDrag(meatBtn, 'meat');
        if (vegBtn) setupDrag(vegBtn, 'veg');
        if (riceBtn) setupDrag(riceBtn, 'rice');

        bindDragToCells();
        window.__dragBind = forceRebind;

        document.addEventListener('dragover', function(e) { e.preventDefault(); });
        document.addEventListener('drop', function(e) { e.preventDefault(); });
        
        // ✅ 修复：不使用 passive，以便在 dragState 存在时阻止滚动
        document.addEventListener('touchmove', function(e) {
            if (dragState) e.preventDefault();
        }, { passive: false });
    }

    function forceRebind() {
        document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
            cell._dragBound = false;
        });
        bindDragToCells();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDrag);
    } else {
        setTimeout(initDrag, 100);
    }

    window.__dragState = function() { return dragState; };

})();