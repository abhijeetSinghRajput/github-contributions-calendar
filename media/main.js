(function () {
  const vscode = acquireVsCodeApi();

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'signInBtn') {
      vscode.postMessage({ type: 'signIn' });
    } else if (target.id === 'refreshBtn') {
      vscode.postMessage({ type: 'refresh' });
    }
  });
})();
