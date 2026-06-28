/**
 * vacation.js — 休假管理（优化刷新逻辑）
 */

(function() {
    'use strict';

    let vacationData = new Set();
    let isReady = false;
    let isFirstLoad = true;

    // ============================================================
    // 存储操作
    // ============================================================
    function loadVacationData() {
        try {
            const raw = localStorage.getItem('diet_vacation_days');
            if (raw) {
                const parsed = JSON.parse(raw);
                vacationData = new Set(parsed);
            }
        } catch (e) {
            vacationData = new Set();
        }
        isReady = true;
        console.log('🏖️ 休假数据已加载:', Array.from(vacationData));

        // ✅ 只在首次加载时刷新主日历，避免与 app.js 的渲染冲突
        if (isFirstLoad && window.__app) {
            isFirstLoad = false;
            const app = window.__app;
            // 使用 requestAnimationFrame 延迟到下一帧，确保 app 已完成初始化
            requestAnimationFrame(() => {
                app.renderCalendar(app.getCurrentYear(), app.getCurrentMonth());
                app.updatePanelForSelectedDate();
            });
        }
    }

    function saveVacationData() {
        try {
            const arr = Array.from(vacationData);
            localStorage.setItem('diet_vacation_days', JSON.stringify(arr));
        } catch (e) {}
    }

    function isVacation(date) {
        if (!date) return false;
        const key = formatDate(date);
        return vacationData.has(key);
    }

    // ============================================================
    // 刷新 UI
    // ============================================================
    function refreshUI() {
        const app = window.__app;
        if (!app) return;
        app.renderCalendar(app.getCurrentYear(), app.getCurrentMonth());
        app.updatePanelForSelectedDate();

        if (document.getElementById('vacationModal') && 
            document.getElementById('vacationModal').classList.contains('active')) {
            renderVacationCalendar(vacationCurrentYear, vacationCurrentMonth);
        }
    }

    function showToastInApp(message) {
        const app = window.__app;
        if (app) {
            app.showToast(message);
        }
    }

    // ============================================================
    // 判断某天是否有有效数据
    // ============================================================
    function hasValidData(date) {
        const app = window.__app;
        if (!app) return false;
        const key = formatDate(date);
        const data = app.markData.get(key);
        if (!data) return false;
        return !!(data.meat || data.veg || data.rice);
    }

    // ============================================================
    // ✅ 顺延：从 fromDate 开始，连续有数据的日期整体往后移一天
    //    遇到空位则停止
    // ============================================================
    function shiftDataForward(fromDate) {
        const app = window.__app;
        if (!app) return;

        const fromKey = formatDate(fromDate);

        const keysToShift = [];
        let currentKey = fromKey;
        let maxCheck = 365;

        while (maxCheck > 0) {
            const currentDate = parseDate(currentKey);
            const hasData = hasValidData(currentDate);

            if (hasData) {
                keysToShift.push(currentKey);
                const nextDate = addDays(currentDate, 1);
                currentKey = formatDate(nextDate);
            } else {
                break;
            }
            maxCheck--;
        }

        if (keysToShift.length === 0) return;

        for (let i = keysToShift.length - 1; i >= 0; i--) {
            const currentKey = keysToShift[i];
            const currentDate = parseDate(currentKey);
            const nextDate = addDays(currentDate, 1);
            const nextKey = formatDate(nextDate);

            const currentData = app.markData.get(currentKey);
            if (!currentData) continue;

            app.markData.set(nextKey, { ...currentData });

            if (vacationData.has(nextKey)) {
                vacationData.delete(nextKey);
            }

            app.markData.set(currentKey, { meat: false, veg: false, rice: false });
        }

        app.saveData();
        refreshUI();
        showToastInApp(`📦 已将 ${keysToShift.length} 个连续日期的数据顺延一天`);
    }

    // ============================================================
    // ✅ 回退：从 fromDate 之后，连续有数据的日期整体往前移一天
    //    遇到空位则停止
    // ============================================================
    function revertShiftData(fromDate) {
        const app = window.__app;
        if (!app) return;

        const fromKey = formatDate(fromDate);

        if (hasValidData(parseDate(fromKey))) {
            return;
        }

        const keysToShift = [];
        let currentDate = addDays(parseDate(fromKey), 1);
        let currentKey = formatDate(currentDate);
        let maxCheck = 365;

        while (maxCheck > 0) {
            const hasData = hasValidData(currentDate);

            if (hasData) {
                keysToShift.push(currentKey);
                currentDate = addDays(currentDate, 1);
                currentKey = formatDate(currentDate);
            } else {
                break;
            }
            maxCheck--;
        }

        if (keysToShift.length === 0) return;

        for (let i = 0; i < keysToShift.length; i++) {
            const currentKey = keysToShift[i];
            const currentDate = parseDate(currentKey);
            const prevDate = addDays(currentDate, -1);
            const prevKey = formatDate(prevDate);

            const currentData = app.markData.get(currentKey);
            if (!currentData) continue;

            app.markData.set(prevKey, { ...currentData });
            app.markData.set(currentKey, { meat: false, veg: false, rice: false });
        }

        app.saveData();
        refreshUI();
        showToastInApp(`↩️ 已将 ${keysToShift.length} 个连续日期的数据回退一天`);
    }

    // ============================================================
    // 计算从某天开始连续有数据的日期数量
    // ============================================================
    function countContinuousData(fromDate) {
        let count = 0;
        let currentDate = new Date(fromDate);
        let maxCheck = 365;

        while (maxCheck > 0) {
            if (hasValidData(currentDate)) {
                count++;
                currentDate = addDays(currentDate, 1);
            } else {
                break;
            }
            maxCheck--;
        }

        return count;
    }

    // ============================================================
    // ✅ 切换休假状态
    // ============================================================
    function toggleVacation(date) {
        const key = formatDate(date);
        const app = window.__app;
        if (!app) {
            alert('应用未初始化，请刷新页面');
            return;
        }

        if (vacationData.has(key)) {
            vacationData.delete(key);
            saveVacationData();
            revertShiftData(date);
            refreshUI();
            showToastInApp(`🏖️ 已取消 ${key} 的休假`);
            return;
        }

        const count = countContinuousData(date);

        if (count > 0) {
            if (!confirm(`⚠️ ${formatDate(date)} 开始有 ${count} 个连续日期有数据。\n设为休假将把这些数据顺延一天。\n继续吗？`)) {
                return;
            }
            shiftDataForward(date);
        }

        vacationData.add(key);
        saveVacationData();
        refreshUI();
        showToastInApp(`🏖️ 已设置 ${key} 为休假`);
    }

    // ============================================================
    // DOM 引用 - 休假浮窗
    // ============================================================
    const vacationModal = document.getElementById('vacationModal');
    const vacationTrigger = document.getElementById('vacationTrigger');
    const vacationModalCloseBtn = document.getElementById('vacationModalCloseBtn');
    const vacationModalCancelBtn = document.getElementById('vacationModalCancelBtn');
    const vacationDaysGrid = document.getElementById('vacationDaysGrid');
    const vacationMonthDisplay = document.getElementById('vacationMonth');
    const vacationYearDisplay = document.getElementById('vacationYear');
    const vacationPrevMonthBtn = document.getElementById('vacationPrevMonthBtn');
    const vacationNextMonthBtn = document.getElementById('vacationNextMonthBtn');

    let vacationCurrentYear = 2026;
    let vacationCurrentMonth = 5;

    // ============================================================
    // 渲染休假日历
    // ============================================================
    function renderVacationCalendar(year, month) {
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();
        let leadingEmpty = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        vacationMonthDisplay.textContent = month + 1;
        vacationYearDisplay.textContent = year;

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
            const isVacation = vacationData.has(key);
            const vacationClass = isVacation ? 'vacation-day' : '';

            html += `
                <div class="day-cell ${isToday ? 'today' : ''} ${vacationClass}" data-date="${key}">
                    <span class="day-number">${d}</span>
                    ${isVacation ? '<span style="font-size:16px;margin-top:2px;">🚫</span>' : ''}
                </div>
            `;
        }

        vacationDaysGrid.innerHTML = html;

        document.querySelectorAll('#vacationDaysGrid .day-cell:not(.empty)').forEach(cell => {
            cell.addEventListener('click', function() {
                const dateStr = this.dataset.date;
                if (dateStr) {
                    const parts = dateStr.split('-').map(Number);
                    const date = new Date(parts[0], parts[1] - 1, parts[2]);
                    toggleVacation(date);
                }
            });
        });
    }

    // ============================================================
    // 浮窗控制
    // ============================================================
    function openVacationModal() {
        vacationModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const app = window.__app;
        if (app) {
            vacationCurrentYear = app.getCurrentYear();
            vacationCurrentMonth = app.getCurrentMonth();
        }
        renderVacationCalendar(vacationCurrentYear, vacationCurrentMonth);
    }

    function closeVacationModal() {
        vacationModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ============================================================
    // 月份切换
    // ============================================================
    function changeVacationMonth(delta) {
        vacationCurrentMonth += delta;
        if (vacationCurrentMonth < 0) {
            vacationCurrentMonth = 11;
            vacationCurrentYear--;
        }
        if (vacationCurrentMonth > 11) {
            vacationCurrentMonth = 0;
            vacationCurrentYear++;
        }
        renderVacationCalendar(vacationCurrentYear, vacationCurrentMonth);
    }

    // ============================================================
    // 事件绑定
    // ============================================================
    if (vacationTrigger) {
        vacationTrigger.addEventListener('click', openVacationModal);
    }
    if (vacationModalCloseBtn) {
        vacationModalCloseBtn.addEventListener('click', closeVacationModal);
    }
    if (vacationModalCancelBtn) {
        vacationModalCancelBtn.addEventListener('click', closeVacationModal);
    }
    if (vacationModal) {
        vacationModal.addEventListener('click', function(e) {
            if (e.target === this) closeVacationModal();
        });
    }
    if (vacationPrevMonthBtn) {
        vacationPrevMonthBtn.addEventListener('click', function() { changeVacationMonth(-1); });
    }
    if (vacationNextMonthBtn) {
        vacationNextMonthBtn.addEventListener('click', function() { changeVacationMonth(1); });
    }

    // ============================================================
    // 暴露给全局
    // ============================================================
    window.__vacation = {
        vacationData: vacationData,
        isVacation: isVacation,
        toggleVacation: toggleVacation,
        loadVacationData: loadVacationData,
        saveVacationData: saveVacationData,
        isReady: function() { return isReady; }
    };

    // ============================================================
    // ✅ 初始化：立即加载数据
    // ============================================================
    loadVacationData();

    if (window.__app) {
        window.__app.__vacationData = vacationData;
        window.__app.isVacation = isVacation;
    }

    if (vacationModal) {
        vacationModal.classList.remove('active');
        document.body.style.overflow = '';
    }

})();