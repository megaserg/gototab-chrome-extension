var getSearchInput = function() {
  return <HTMLInputElement> document.getElementById("searchInput");
};

export var getWrapper = function() {
  return <HTMLDivElement> document.getElementById("containerWrapper");
};

export var getCurrentQuery = function(): string {
  return getSearchInput().value;
}

export var setFocusOnInput = function(): void {
  getSearchInput().focus();
};

export var displayItemListset = function(itemListsetDiv: HTMLDivElement) {
  var wrapper = getWrapper();

  // remove old container
  while (wrapper.firstChild) {
    wrapper.removeChild(wrapper.firstChild);
  }

  wrapper.appendChild(itemListsetDiv);
};

// export var highlightItem = function(index: number) {
//   var listsContainer = getWrapper();
//   var itemDivs = listsContainer.firstChild.childNodes;
//
//   for (var i = 0; i < itemDivs.length; i++) {
//     var itemDiv = <HTMLElement> itemDivs[i];
//     if (i == index) {
//       itemDiv.classList.add("highlighted");
//     } else {
//       itemDiv.classList.remove("highlighted");
//     }
//   }
// }

var obtainItem = function(itemListIndex: number, itemIndex: number): HTMLElement {
  var wrapper = getWrapper();
  var itemListDivs = wrapper.firstChild.childNodes;
  var itemListDiv = <HTMLElement> itemListDivs[itemListIndex];
  var itemDivs = itemListDiv.childNodes;
  var itemDiv = <HTMLElement> itemDivs[itemIndex];
  return itemDiv;
}

export var highlightItem = function(itemListIndex: number, itemIndex: number): void {
  obtainItem(itemListIndex, itemIndex).classList.add("highlighted");
}

export var unhighlightItem = function(itemListIndex: number, itemIndex: number): void {
  obtainItem(itemListIndex, itemIndex).classList.remove("highlighted");
}

var wireKeyPressCallbacks = function(
    input: HTMLElement,
    processKeyDown: (KeyboardEvent) => void,
    processKeyUp: (KeyboardEvent) => void): void {
  input.addEventListener("keydown", processKeyDown, false);
  input.addEventListener("keyup", processKeyUp, false);
};

export var wireKeyPressesForInput = function(
    processKeyDown: (KeyboardEvent) => void,
    processKeyUp: (KeyboardEvent) => void): void {
  wireKeyPressCallbacks(getSearchInput(), processKeyDown, processKeyUp);
}

export var executeOnload = function(onContentLoaded: () => void) {
  document.addEventListener("DOMContentLoaded", onContentLoaded);
}
