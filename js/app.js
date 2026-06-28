/**
 * app.js — 主应用（完全重写版）
 */

(function () {
    'use strict';

    // ============================================================
    // 数据层
    // ============================================================
    let markData = new Map();
    let currentYear, currentMonth, selectedDate = null;
    let dragState = null;

    // ============================================================
    // 存储操作
    // ============================================================
    function loadData() {
        try {
            const raw = localStorage.getItem('diet_calendar_marks');
            if (raw) {
                const parsed = JSON.parse(raw);
                markData = new Map(Object.entries(parsed));
            } else {
                // 初始化示例数据
                const today = getToday();
                const y = today.getFullYear();
                const m = today.getMonth();
                const d = today.getDate();
                for (let i = 1; i <= 5; i++) {
                    const dt = new Date(y, m, d - i);
                    const key = formatDate(dt);
                    if (!markData.has(key)) {
                        const r = Math.random();
                        if (r < 0.3) markData.set(key, { meat: true, veg: false, rice: true });
                        else if (r < 0.6) markData.set(key, { meat: false, veg: true, rice: false });
                        else if (r < 0.8) markData.set(key, { meat: true, veg: true, rice: false });
                        else markData.set(key, { meat: false, veg: false, rice: true });
                    }
                }
                const todayKey = formatDate(today);
                if (!markData.has(todayKey)) {
                    markData.set(todayKey, { meat: false, veg: false, rice: false });
                }
                saveData();
            }
        } catch (e) {
            markData = new Map();
        }
        updateStats();
    }

    function saveData() {
        try {
            const obj = Object.fromEntries(markData);
            localStorage.setItem('diet_calendar_marks', JSON.stringify(obj));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
        updateStats();
    }

    function updateStats() {
        // ✅ 只统计至少有一项标记为 true 的日期
        let count = 0;
        for (const [key, value] of markData) {
            if (value.meat || value.veg || value.rice) {
                count++;
            }
        }
        const el = document.getElementById('totalMarkedDays');
        if (el) el.textContent = count;
    }

    function setMark(date, type, value) {
        const key = formatDate(date);
        if (!markData.has(key)) {
            markData.set(key, { meat: false, veg: false, rice: false });
        }
        const entry = markData.get(key);
        if (entry[type] === undefined) entry[type] = false;
        entry[type] = value;

        // ✅ 如果所有标记都为 false，删除该 key
        if (!entry.meat && !entry.veg && !entry.rice) {
            markData.delete(key);
        }

        saveData();
        renderCalendar(currentYear, currentMonth);
        updatePanelForSelectedDate();
    }

    function toggleMark(date, type) {
        const key = formatDate(date);
        if (!markData.has(key)) {
            markData.set(key, { meat: false, veg: false, rice: false });
        }
        const entry = markData.get(key);
        if (entry[type] === undefined) entry[type] = false;
        entry[type] = !entry[type];

        // ✅ 如果所有标记都为 false，删除该 key
        if (!entry.meat && !entry.veg && !entry.rice) {
            markData.delete(key);
        }

        saveData();
        renderCalendar(currentYear, currentMonth);
        updatePanelForSelectedDate();
    }

    function clearDayMarks(date) {
        const key = formatDate(date);
        if (markData.has(key)) {
            markData.delete(key);
            saveData();
            renderCalendar(currentYear, currentMonth);
            updatePanelForSelectedDate();
        }
    }

    function clearCurrentMonth() {
        const year = currentYear;
        const month = currentMonth;

        const keysToRemove = [];
        for (const key of markData.keys()) {
            const date = parseDate(key);
            if (date.getFullYear() === year && date.getMonth() === month) {
                keysToRemove.push(key);
            }
        }

        if (keysToRemove.length === 0) {
            showToast(`📭 ${year}年${month + 1}月 没有数据需要清空`);
            return;
        }

        const confirmMsg = `确定要清空 ${year}年${month + 1}月 的 ${keysToRemove.length} 条数据吗？\n此操作不可撤销！`;
        if (!confirm(confirmMsg)) return;

        for (const key of keysToRemove) {
            markData.delete(key);
        }
        saveData();

        renderCalendar(currentYear, currentMonth);
        updatePanelForSelectedDate();

        showToast(`🗑️ 已清空 ${year}年${month + 1}月 的 ${keysToRemove.length} 条数据`);
    }

    // ============================================================
    // DOM 引用
    // ============================================================
    const monthDisplay = document.getElementById('monthDisplay');
    const yearDisplay = document.getElementById('yearDisplay');
    const daysGrid = document.getElementById('daysGrid');
    const panelDate = document.getElementById('panelDate');
    const meatBtn = document.getElementById('meatBtn');
    const vegBtn = document.getElementById('vegBtn');
    const riceBtn = document.getElementById('riceBtn');
    const resetDayBtn = document.getElementById('resetDayBtn');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');

    // ============================================================
    // 渲染
    // ============================================================
    function renderCalendar(year, month) {
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();
        let leadingEmpty = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        monthDisplay.textContent = month + 1;
        yearDisplay.textContent = year;

        const today = getToday();
        const todayKey = formatDate(today);
        let html = '';

        for (let i = 0; i < leadingEmpty; i++) {
            html += `<div class="day-cell empty"></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = formatDate(dateObj);
            const isToday = (key === todayKey);
            const isVacation = window.__vacation ? window.__vacation.isVacation(dateObj) : false;
            const marks = markData.get(key) || { meat: false, veg: false, rice: false };

            let selectedClass = '';
            if (selectedDate && formatDate(selectedDate) === key) {
                selectedClass = 'selected';
            }

            const vacationClass = isVacation ? 'vacation-day' : '';

            // ✅ 判断是否三样全有
            const allMarked = marks.meat && marks.veg && marks.rice;
            const allMarkedClass = allMarked ? 'all-marked' : '';

            // 休假日期隐藏标记，非休假日期正常显示
            let meatActive = '';
            let vegActive = '';
            let riceActive = '';

            if (!isVacation) {
                meatActive = marks.meat ? 'active' : '';
                vegActive = marks.veg ? 'active' : '';
                riceActive = marks.rice ? 'active' : '';
            }

            html += `
        <div class="day-cell ${isToday ? 'today' : ''} ${selectedClass} ${vacationClass} ${allMarkedClass}" data-date="${key}">
            <span class="day-number">${d}</span>
            <div class="mark-group">
                <div class="mark-item ${meatActive}">
                    <span class="dot meat"></span>
                    <span class="label">肉</span>
                </div>
                <div class="mark-item ${vegActive}">
                    <span class="dot veg"></span>
                    <span class="label">菜</span>
                </div>
                <div class="mark-item ${riceActive}">
                    <span class="dot rice"></span>
                    <span class="label">饭</span>
                </div>
            </div>
        </div>
    `;
        }

        daysGrid.innerHTML = html;

        // ===== 绑定日期点击事件 =====
        document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', function () {
                const dateStr = this.dataset.date;
                if (dateStr) {
                    const parts = dateStr.split('-').map(Number);
                    const newDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    selectedDate = newDate;
                    renderCalendar(currentYear, currentMonth);
                    updatePanelForSelectedDate();
                }
            });
        });

        updatePanelForSelectedDate();


        // ============================================================
        // ✅ 渲染完成后重新绑定拖拽事件
        // ============================================================
        if (window.__dragBind) {
            window.__dragBind();
        }
    }

    function updatePanelForSelectedDate() {
        if (!selectedDate) {
            panelDate.innerHTML = `
                <span class="date-icon">📅</span> 选择日期
                <span>未选中</span>
            `;
            [meatBtn, vegBtn, riceBtn].forEach(btn => btn.className = 'mark-btn');
            return;
        }
        const key = formatDate(selectedDate);
        const marks = markData.get(key) || { meat: false, veg: false, rice: false };
        const dateStr =
            `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
        panelDate.innerHTML = `
            <span class="date-icon">📅</span> ${dateStr}
            <span class="highlight">已选</span>
        `;

        meatBtn.className = `mark-btn ${marks.meat ? 'active-meat' : ''}`;
        vegBtn.className = `mark-btn ${marks.veg ? 'active-veg' : ''}`;
        riceBtn.className = `mark-btn ${marks.rice ? 'active-rice' : ''}`;
    }

    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
    }

    // ============================================================
    // 拖拽系统
    // ============================================================
    function setupDrag(btn, type) {
        let clone = null;
        let isDragging = false;

        btn.addEventListener('mousedown', function (e) {
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

        document.addEventListener('mousemove', function (e) {
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

        document.addEventListener('mouseup', function (e) {
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

        btn.addEventListener('touchstart', function (e) {
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

        btn.addEventListener('touchmove', function (e) {
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

        btn.addEventListener('touchend', function (e) {
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

        btn.addEventListener('touchcancel', function (e) {
            clearTimeout(longPressTimer);
            if (touchClone && touchClone.parentNode) document.body.removeChild(touchClone);
            touchClone = null;
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
            dragState = null;
            document.querySelectorAll('.day-cell.drag-over').forEach(el2 => el2.classList.remove('drag-over'));
        }, { passive: true });
    }

    // ============================================================
    // Toast 反馈
    // ============================================================
    function showToast(messages) {
        const toast = document.getElementById('toast');
        const text = Array.isArray(messages) ? messages.join('<br>') : messages;
        toast.innerHTML = text;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    // ============================================================
    // 浮窗控制
    // ============================================================
    const modal = document.getElementById('mealPrepModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const mealPrepTrigger = document.getElementById('mealPrepTrigger');
    const meatInput = document.getElementById('meatCount');
    const vegInput = document.getElementById('vegCount');
    const riceInput = document.getElementById('riceCount');

    function openModal() {
        modal.classList.add('active');
        meatInput.value = '';
        vegInput.value = '';
        riceInput.value = '';
        setTimeout(() => meatInput.focus(), 50);
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    mealPrepTrigger.addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    // ============================================================
    // ✅ 批量备餐核心逻辑
    // ============================================================
    function batchMealPlan(meatCount, vegCount, riceCount) {
        const today = getToday();
        const startDate = addDays(today, 1);

        console.log('📅 批量备餐开始, 起始日期:', formatDate(startDate));

        const results = {
            meat: { placed: 0, skipped: 0, startDate: null },
            veg: { placed: 0, skipped: 0, startDate: null },
            rice: { placed: 0, skipped: 0, startDate: null }
        };

        function scheduleItem(type, count) {
            if (count <= 0) return;

            let placed = 0;
            let skipped = 0;
            let dayOffset = 0;
            let firstPlacedDate = null;

            while (placed < count) {
                const date = addDays(startDate, dayOffset);
                const key = formatDate(date);

                // ✅ 检查休假
                if (window.__vacation && window.__vacation.isVacation(date)) {
                    console.log(`  🏖️ ${key} 休假，跳过（不消耗份数）`);
                    dayOffset++;
                    continue;
                }

                let entry = markData.get(key);
                if (!entry) {
                    entry = { meat: false, veg: false, rice: false };
                    markData.set(key, entry);
                }

                const hasMark = entry[type] === true;
                console.log(`  📍 ${key}: ${type} = ${hasMark}`);

                if (!hasMark) {
                    entry[type] = true;
                    markData.set(key, entry);
                    saveData();
                    placed++;
                    if (!firstPlacedDate) firstPlacedDate = date;
                    console.log(`     ✅ 排上 ${type} (${placed}/${count})`);
                } else {
                    skipped++;
                    console.log(`     ⏭️ 跳过（已有标记）`);
                }
                dayOffset++;
            }

            results[type].placed = placed;
            results[type].skipped = skipped;
            results[type].startDate = firstPlacedDate;

            console.log(`  📊 结果: 已排 ${placed} 份, 跳过 ${skipped} 天, 开始日期: ${firstPlacedDate ? formatDate(firstPlacedDate) : '无'}`);
        }

        if (meatCount > 0) scheduleItem('meat', meatCount);
        if (vegCount > 0) scheduleItem('veg', vegCount);
        if (riceCount > 0) scheduleItem('rice', riceCount);

        renderCalendar(currentYear, currentMonth);
        updatePanelForSelectedDate();

        const messages = [];
        const typeEmojis = { meat: '🥩', veg: '🥬', rice: '🍚' };
        const typeNames = { meat: '肉类', veg: '蔬菜', rice: '米饭' };

        const items = [
            { key: 'meat', count: meatCount },
            { key: 'veg', count: vegCount },
            { key: 'rice', count: riceCount }
        ];

        let hasSkipped = false;

        for (const item of items) {
            if (item.count <= 0) continue;
            const r = results[item.key];
            const emoji = typeEmojis[item.key];
            const name = typeNames[item.key];

            let msg = `${emoji} ${name}：已排 ${r.placed} 份`;
            if (r.skipped > 0) {
                msg += `，⏭️ 跳过 ${r.skipped} 天（已有标记）`;
                hasSkipped = true;
            }
            if (r.startDate) {
                msg += `，从 ${r.startDate.getMonth() + 1}月${r.startDate.getDate()}日开始`;
            }
            messages.push(msg);
        }

        if (hasSkipped) {
            messages.unshift('⏭️ 已自动跳过已有标记的日期');
        }
        messages.unshift('📦 批量备餐完成！');

        console.log('📋 最终反馈:', messages);

        return messages;
    }

    // ============================================================
    // 确认排期
    // ============================================================
    modalConfirmBtn.addEventListener('click', function () {
        const meat = parseInt(meatInput.value) || 0;
        const veg = parseInt(vegInput.value) || 0;
        const rice = parseInt(riceInput.value) || 0;

        if (meat === 0 && veg === 0 && rice === 0) {
            showToast('⚠️ 请至少输入一项份数（大于 0）');
            return;
        }

        if (meat > 30 || veg > 30 || rice > 30) {
            showToast('⚠️ 每项最多 30 份');
            return;
        }

        const results = batchMealPlan(meat, veg, rice);
        closeModal();
        showToast(results);
    });

    document.querySelectorAll('.form-row input').forEach(input => {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                modalConfirmBtn.click();
            }
        });
    });

    // ============================================================
    // 手动标记
    // ============================================================
    meatBtn.addEventListener('click', function () {
        if (!selectedDate) { alert('请先点击日期选中一天'); return; }
        if (window.__vacation && window.__vacation.isVacation(selectedDate)) {
            showToast('🏖️ 该日为休假日期，不可标记');
            return;
        }
        toggleMark(selectedDate, 'meat');
    });

    vegBtn.addEventListener('click', function () {
        if (!selectedDate) { alert('请先点击日期选中一天'); return; }
        if (window.__vacation && window.__vacation.isVacation(selectedDate)) {
            showToast('🏖️ 该日为休假日期，不可标记');
            return;
        }
        toggleMark(selectedDate, 'veg');
    });

    riceBtn.addEventListener('click', function () {
        if (!selectedDate) { alert('请先点击日期选中一天'); return; }
        if (window.__vacation && window.__vacation.isVacation(selectedDate)) {
            showToast('🏖️ 该日为休假日期，不可标记');
            return;
        }
        toggleMark(selectedDate, 'rice');
    });

    resetDayBtn.addEventListener('click', function () {
        if (!selectedDate) { alert('请先点击日期选中一天'); return; }
        if (window.__vacation && window.__vacation.isVacation(selectedDate)) {
            showToast('🏖️ 该日为休假日期，不可清空');
            return;
        }
        if (confirm(`清除 ${formatDate(selectedDate)} 的所有标记？`)) {
            clearDayMarks(selectedDate);
        }
    });

    prevMonthBtn.addEventListener('click', function () { changeMonth(-1); });
    nextMonthBtn.addEventListener('click', function () { changeMonth(1); });

    const clearMonthBtn = document.getElementById('clearMonthBtn');
    if (clearMonthBtn) {
        clearMonthBtn.addEventListener('click', clearCurrentMonth);
    }

    // ============================================================
    // 初始化拖拽
    // ============================================================
    setupDrag(meatBtn, 'meat');
    setupDrag(vegBtn, 'veg');
    setupDrag(riceBtn, 'rice');

    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) {
        if (dragState) e.preventDefault();
    }, { passive: false });

    // ============================================================
    // 初始化
    // ============================================================
    function init() {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        selectedDate = getToday();
        loadData();
        renderCalendar(currentYear, currentMonth);
    }
    init();

    window.__app = {
        markData: markData,
        setMark: setMark,
        toggleMark: toggleMark,
        clearDayMarks: clearDayMarks,
        renderCalendar: renderCalendar,
        updatePanelForSelectedDate: updatePanelForSelectedDate,
        showToast: showToast,
        getSelectedDate: function () { return selectedDate; },
        setSelectedDate: function (date) { selectedDate = date; },
        getCurrentYear: function () { return currentYear; },
        getCurrentMonth: function () { return currentMonth; },
        saveData: saveData,
        batchMealPlan: batchMealPlan,
        clearCurrentMonth: clearCurrentMonth
    };

})();