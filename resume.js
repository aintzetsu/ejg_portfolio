'use strict';
const printResumeBtn = document.getElementById('printResumeBtn');
if (printResumeBtn) {
  printResumeBtn.addEventListener('click', () => window.print());
}
