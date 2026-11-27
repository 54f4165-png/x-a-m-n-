const hideStatusPanel = document.createElement('style');
hideStatusPanel.textContent = `
    .v84-status {
        display: none !important;
    }
`;
document.head.appendChild(hideStatusPanel);
