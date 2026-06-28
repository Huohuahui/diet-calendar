/**
 * batch.js — 批量备餐 UI 绑定
 */

(function() {
    'use strict';

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

    if (mealPrepTrigger) {
        mealPrepTrigger.addEventListener('click', openModal);
    }
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeModal);
    }
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }

    document.querySelectorAll('.form-row input').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && modalConfirmBtn) {
                modalConfirmBtn.click();
            }
        });
    });

    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

})();