// Comment section: show/hide toggle and comment form submission

export function initCommentToggle() {
  var showHideBtn = document.querySelector('.show-hide');
  var commentWrapper = document.querySelector('.comment-wrapper');

  commentWrapper.style.display = 'none';

  showHideBtn.onclick = function() {
    var showHideText = showHideBtn.textContent;
    if (showHideText === 'Show comment') {
      showHideBtn.textContent = 'Hide comments';
      commentWrapper.style.display = 'block';
    } else {
      showHideBtn.textContent = 'Show comments';
      commentWrapper.style.display = 'none';
    }
  };
}

export function initCommentForm() {
  var form = document.querySelector('.comment-form');
  var nameField = document.querySelector('#name');
  var commentField = document.querySelector('#comment');
  var list = document.querySelector('.comment-container');

  form.onsubmit = function(e) {
    e.preventDefault();

    var nameValue = nameField.value.trim();
    var commentValue = commentField.value.trim();

    if (!nameValue || !commentValue) {
      return;
    }

    var listItem = document.createElement('li');
    var namePara = document.createElement('p');
    var commentPara = document.createElement('p');

    namePara.textContent = nameValue;
    commentPara.textContent = commentValue;

    list.appendChild(listItem);
    listItem.appendChild(namePara);
    listItem.appendChild(commentPara);

    nameField.value = '';
    commentField.value = '';
  };
}
