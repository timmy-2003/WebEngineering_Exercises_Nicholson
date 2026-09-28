// Comment section: show/hide toggle and comment form submission

import { requireElement } from './dom.ts';

export function initCommentToggle(): void {
  const showHideBtn = requireElement<HTMLElement>('.show-hide');
  const commentWrapper = requireElement<HTMLElement>('.comment-wrapper');

  commentWrapper.style.display = 'none';
  let isVisible = false;

  showHideBtn.onclick = () => {
    isVisible = !isVisible;
    showHideBtn.textContent = isVisible ? 'Hide comments' : 'Show comments';
    commentWrapper.style.display = isVisible ? 'block' : 'none';
  };
}

function createCommentItem(name: string, comment: string): HTMLLIElement {
  const listItem = document.createElement('li');
  const namePara = document.createElement('p');
  const commentPara = document.createElement('p');

  namePara.textContent = name;
  commentPara.textContent = comment;

  listItem.append(namePara, commentPara);
  return listItem;
}

export function initCommentForm(): void {
  const form = requireElement<HTMLFormElement>('.comment-form');
  const nameField = requireElement<HTMLInputElement>('#name');
  const commentField = requireElement<HTMLInputElement>('#comment');
  const commentList = requireElement<HTMLUListElement>('.comment-container');

  form.onsubmit = (e: SubmitEvent) => {
    e.preventDefault();

    const nameValue = nameField.value.trim();
    const commentValue = commentField.value.trim();

    if (nameValue === '' || commentValue === '') {
      return;
    }

    commentList.appendChild(createCommentItem(nameValue, commentValue));

    nameField.value = '';
    commentField.value = '';
  };
}
