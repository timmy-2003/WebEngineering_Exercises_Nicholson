// Comment section: show/hide toggle and comment form submission

export function initCommentToggle() {
  const showHideBtn = document.querySelector('.show-hide');
  const commentWrapper = document.querySelector('.comment-wrapper');

  commentWrapper.style.display = 'none';
  let isVisible = false;

  showHideBtn.onclick = () => {
    isVisible = !isVisible;
    showHideBtn.textContent = isVisible ? 'Hide comments' : 'Show comments';
    commentWrapper.style.display = isVisible ? 'block' : 'none';
  };
}

export function initCommentForm() {
  const form = document.querySelector('.comment-form');
  const nameField = document.querySelector('#name');
  const commentField = document.querySelector('#comment');
  const list = document.querySelector('.comment-container');

  form.onsubmit = (e) => {
    e.preventDefault();

    const nameValue = nameField.value.trim();
    const commentValue = commentField.value.trim();

    if (!nameValue || !commentValue) {
      return;
    }

    const listItem = document.createElement('li');
    const namePara = document.createElement('p');
    const commentPara = document.createElement('p');

    namePara.textContent = nameValue;
    commentPara.textContent = commentValue;

    list.appendChild(listItem);
    listItem.appendChild(namePara);
    listItem.appendChild(commentPara);

    nameField.value = '';
    commentField.value = '';
  };
}
