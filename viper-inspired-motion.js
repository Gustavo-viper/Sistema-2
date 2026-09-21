/* Lightweight motion enhancements. Does not touch Supabase or application data. */
(function () {
  'use strict';

  function initMotion() {
    document.body.classList.add('motion-ready');

    var candidates = document.querySelectorAll(
      '.section, .card, .panel, .action-card, .budget-request-card, .service-item-client, .notifications-panel, .stat-card, .login-box'
    );

    candidates.forEach(function (element, index) {
      element.classList.add('motion-reveal');
      element.style.transitionDelay = Math.min(index * 35, 280) + 'ms';
    });

    if (!('IntersectionObserver' in window)) {
      candidates.forEach(function (element) { element.classList.add('motion-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    candidates.forEach(function (element) { observer.observe(element); });

    document.querySelectorAll('.btn-primary, .btn-success, .btn-warning, .btn-danger, .auth-btn').forEach(function (button) {
      button.classList.add('motion-shine');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion, { once: true });
  } else {
    initMotion();
  }
})();
