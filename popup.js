const REVIEW_LINK_REGEX =
    /^(?!.*(internal|googleplex))https:\/\/([a-zA-Z0-9-]+)-review\.googlesource\.com/g;

function GerritBugReport(currentTab) {
  this.image = '';
  this.url = currentTab;
};
GerritBugReport.prototype._addEventListeners = function(button, submitBtn) {
  button.addEventListener('click', this._handleTap.bind(this));
  submitBtn.addEventListener('click', this._handleSubmit.bind(this));
}
GerritBugReport.prototype._handleTap = function() {
  chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(img) {
    this.image = img;
    document.getElementById('target').src = img;
    document.getElementById('screenshotBtn').classList.add('hidden');
  }.bind(this));
};
GerritBugReport.prototype._computeQueryString = function(url, queryParams) {
  for (const key of Object.keys(queryParams)) {
    url += `${key}=${queryParams[key]}&`
  }
  return url;
};
GerritBugReport.prototype._reset = function(url, queryParams) {
  document.getElementById('summary').value = '';
  document.getElementById('description').value = '';
  this.image = '';
  document.getElementById('target').src = '';
  document.getElementById('submitBtn').disabled = false;
};
GerritBugReport.prototype._handleSubmit = function() {
  const summary = document.getElementById('summary').value;
  let description = 'Bug report from ' + encodeURIComponent(this.url) +
      '%0A%0A' + document.getElementById('description').value;
  const components = 'PolyGerrit';
  const queryParams = { summary, description, components }
  let url = 'https://bugs.chromium.org/p/gerrit/issues/entry?';
  if (!this.image) {
    url = this._computeQueryString(url, queryParams);
    this._reset();
    return chrome.tabs.create({url: url}, function(tab){ alert(tab.id) });
  }

  // Post image to imgur
  document.getElementById('submitBtn').disabled = true;
  var xhr = new XMLHttpRequest(), formData = new FormData();
  xhr.open('POST', 'https://api.imgur.com/3/image.json', true);
  formData.append('image', this.image.replace('data:image/png;base64,' , ''));
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const imageLink = JSON.parse(xhr.responseText).data.link;
      description = description + '%0A%0A'
          + 'Screenshot: ' + imageLink;
      queryParams.description = description;
      url = this._computeQueryString(url, queryParams);
      this._reset();
      chrome.tabs.create({'url': url}, function(tab){ alert(tab.id) })
    }
  }.bind(this)
  xhr.setRequestHeader('Authorization', 'Client-ID 2c8d8a8a1a0d4cb')
  xhr.send(formData);
};

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    const currentTab = tabs[0].url;

    if (!currentTab.match(REVIEW_LINK_REGEX)) {
      return;
    }

    document.getElementById('error').classList.add('hidden');
    document.getElementById('gerritBugReport').classList.remove('hidden');
    const button = document.getElementById('screenshotBtn');
    const submitBtn = document.getElementById('submitBtn');
    const gerritBugReport = new GerritBugReport(currentTab);
    gerritBugReport._addEventListeners(button, submitBtn);
  });
});
