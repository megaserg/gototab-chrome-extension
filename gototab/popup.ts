declare var chrome: any;
declare var FuzzySearch: any;

interface Tab {
  title: string;
  url: string;
  favIconUrl: string;
}

/////////////////////////
// View functions
/////////////////////////

// TODO: these functions should be inside one View object.

var $ = function(id) {
  return document.getElementById(id);
}

var getSearchInput = function() {
  return <HTMLInputElement> document.getElementById("searchInput");
};

var getItemListsContainer = function() {
  return <HTMLDivElement> document.getElementById("itemListsContainer");
};

var setFocusOnInput = function() {
  getSearchInput().focus();
};

var displayItemLists = function(itemDivLists: HTMLDivElement[]) {
  var container = getItemListsContainer();

  // remove old items
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (var i in itemDivLists) {
    var itemDivList = itemDivLists[i];
    container.appendChild(itemDivList);
  }
};

var gotoTab = function(tab) {
  chrome.tabs.update(tab.id, {active: true});
  chrome.windows.update(tab.windowId, {focused: true});
};

var openUrl = function(url) {
  chrome.tabs.create({
    "url": url
  }, function(tab) {});
};

var openHistory = function() {
  openUrl("chrome://history");
};

var openDownloads = function() {
  openUrl("chrome://downloads");
};

/////////////////////////
// View helpers
/////////////////////////

var emphasize = function(str, indices) {
  var res = "";

  var n = str.length;
  var m = indices.length;

  var start = 0;
  for (var j = 0; j < m; j++) {
    res += str.substring(start, indices[j][0]);
    res += "<b>";
    res += str.substring(indices[j][0], indices[j][1]);
    res += "</b>";
    start = indices[j][1];
  }
  res += str.substring(start, n);

  return res;
};

// Interfaces

interface Item {}

interface ItemView {
  render(): HTMLDivElement;
}

// Tab Item

class TabItem implements Item {
  constructor(
    public tab: Tab,
    public titleIndices: number[][],
    public urlIndices: number[][]) {}
}

class TabItemView implements ItemView {
  constructor(private item: TabItem) {}

  render(): HTMLDivElement {
    var tab = this.item.tab;
    var titleIndices = this.item.titleIndices;
    var urlIndices = this.item.urlIndices;

    var div = document.createElement("div");

    var favicon = document.createElement("img");
    favicon.classList.add("favicon");
    if (typeof(tab.favIconUrl) != "undefined") {
      favicon.src = tab.favIconUrl;
    }

    var titleSpan = document.createElement("span");
    titleSpan.classList.add("title");
    titleSpan.innerHTML = emphasize(tab.title, titleIndices);

    var br = document.createElement("br");

    var urlSpan = document.createElement("span");
    urlSpan.classList.add("url");
    urlSpan.innerHTML = emphasize(tab.url, urlIndices);

    div.appendChild(favicon);
    div.appendChild(titleSpan);
    div.appendChild(br);
    div.appendChild(urlSpan);

    return div;
  }
}

// Action Item

class ActionItem implements Item {
  constructor(
    public name: string,
    public shortcut: string) {}
}

class ActionItemView implements ItemView {
  constructor(private item: ActionItem) {}

  render(): HTMLDivElement {
    var div = document.createElement("div");

    var actionNameSpan = document.createElement("span");
    actionNameSpan.classList.add("title");
    actionNameSpan.innerHTML = this.item.name + " " + this.item.shortcut;

    div.appendChild(actionNameSpan);

    return div;
  }
}

// Item List View

class ItemListView {
  constructor(public itemViews: ItemView[]) {}

  render(): HTMLDivElement {
    var n = this.itemViews.length;

    var listDiv = document.createElement("div");
    listDiv.classList.add("itemList");

    for (var i = 0; i < n; i++) {

      var itemDiv = this.itemViews[i].render();
      itemDiv.classList.add("listItem");

      itemDiv.addEventListener("mouseover", (function(index) {
        return function(event) {
          model.setHighlightedItemIndex(index);
        }
      })(i), false);

      itemDiv.addEventListener("click", function(event) {
        if (model.hasItems()) {
          gotoTab(model.getHighlightedItem().tab);
        }
      }, false);

      listDiv.appendChild(itemDiv);
    }
    return listDiv;
  }
}

function renderTabItems(items: TabItem[]): HTMLDivElement {
  return new ItemListView(items.map((item) => new TabItemView(item))).render();
}

function renderActionItems(items: ActionItem[]): HTMLDivElement {
  return new ItemListView(items.map((item) => new ActionItemView(item))).render();
}


// ==============================================

var refreshTabList = function() {
  var lists = [
    renderTabItems(model.getItemsToDisplay()),
    renderActionItems([new ActionItem("Open history", "Cmd+H")])
  ];
  displayItemLists(lists);
};

var refreshHighlighting = function() {
  var highlightedTabIndex = model.getHighlightedItemIndex();

  var listsContainer = getItemListsContainer();
  var itemDivs = listsContainer.firstChild.childNodes;

  console.log(itemDivs);

  for (var i = 0; i < itemDivs.length; i++) {
    var itemDiv = <HTMLElement> itemDivs[i];
    if (i == highlightedTabIndex) {
      itemDiv.classList.add("highlighted");
    } else {
      itemDiv.classList.remove("highlighted");
    }
  }
};


/////////////////////////
// Model
/////////////////////////

/*
 * TODO: ideally, model should not be calling refresh...(), but rather
 * broadcast an event "I, model, have changed". Controller should listen
 * to this event and update view whenever it comes.
 */

class ItemList<T extends Item> {

  private displayedItems: T[] = [];
  private highlightedItemIndex = 0;

  // private methods
  private isValidIndex(index: number): boolean {
    return 0 <= index && index < this.displayedItems.length;
  }

  // privileged methods (public, but able to access private variables)
  hasItems(): boolean {
    return this.displayedItems.length > 0;
  }

  getItemsToDisplay(): T[] {
    return this.displayedItems;
  }

  getHighlightedItemIndex(): number {
    return this.highlightedItemIndex;
  }

  getHighlightedItem(): T {
    if (this.hasItems() && this.isValidIndex(this.highlightedItemIndex)) {
      return this.displayedItems[this.highlightedItemIndex];
    }
  }

  setDisplayedItems(items: T[]): void {
    this.displayedItems = items;
    this.highlightedItemIndex = 0;
    refreshTabList();
    refreshHighlighting();
  }

  setHighlightedItemIndex(index: number): void {
    if (this.highlightedItemIndex != index) {
      this.highlightedItemIndex = index;
      refreshHighlighting();
    }
  }

  decrementIndexIfPossible(): void {
    if (this.hasItems() && this.isValidIndex(this.highlightedItemIndex - 1)) {
      this.highlightedItemIndex--;
      refreshHighlighting();
    }
  }

  incrementIndexIfPossible(): void {
    if (this.hasItems() && this.isValidIndex(this.highlightedItemIndex + 1)) {
      this.highlightedItemIndex++;
      refreshHighlighting();
    }
  }
}

var model = new ItemList<TabItem>();

/////////////////////////
// Business logic
/////////////////////////

/**
 * Gets all tabs.
 *
 * @param {function(array[Tab])} processTabs
 *   Called with the list of tabs.
 */
var asyncGetTabs = function(processTabs) {
  var queryInfo = {
    // To limit the search to the current window, uncomment the following line.
    // currentWindow: true
  };

  chrome.tabs.query(queryInfo, processTabs);
};

var addEmptyIndices = function(tabs) {
  return tabs.map(function(tab) {
    return new TabItem(tab, [[0, 0]], [[0, 0]]);
  });
};

var filterTabs = function(tabs, query) {
  var indicesCaseInsensitive = function(substring) {
    // Workaround for empty search term
    if (substring.length == 0) {
      return function(string) {
        return [[0, 0]];
      };
    }

    substring = substring.toLowerCase();
    return function(string) {
      string = string.toLowerCase();
      var start = 0, m = substring.length;
      var index, indices = [];
      while ((index = string.indexOf(substring, start)) > -1) {
        indices.push([index, index + m]);
        start = index + m;
      }
      return indices;
    };
  };
  var indicesOfQuery = indicesCaseInsensitive(query);

  var tabsWithIndices = tabs.map(function(tab) {
    return new TabItem(tab, indicesOfQuery(tab.title), indicesOfQuery(tab.url));
  });

  var scorer = new FuzzySearch(query);
  var filter = FuzzySearch.filterRegex(query);

  var getScores = function(tab) {
    return Math.max(scorer.score(tab.title), scorer.score(tab.url));
  };

  var filterPredicate = function(tabWithIndex) {
    return filter.test(tabWithIndex.tab.title) || filter.test(tabWithIndex.tab.url);
  }

  return tabsWithIndices.filter(filterPredicate).sort(function(a, b) {
    return getScores(b.tab) - getScores(a.tab);
  });
};

/////////////////////////
// Controller functions
/////////////////////////

/**
 * Wires up the functions to react on the input.
 *
 * @param {InputHTMLElement} input
 *   Input element to react on.
 * @param {function(event)} processKeyDown
 *   Called when user pushes the key.
 * @param {function(event)} processKeyUp
 *   Called when user releases the key.
 */
var wireInputListeners = function(input, processKeyDown, processKeyUp) {
  input.addEventListener("keydown", processKeyDown, false);
  input.addEventListener("keyup", processKeyUp, false);
};

var getMapping = function(map, key) {
  var value = map[key];
  if (typeof(value) == "undefined") {
    value = map["default"];
  }
  return value;
};

// TODO: have "all tabs" in the model?
var wireInput = function(tabs) {
  var noop = function() {};

  var processInput = function(event) {
    var query = getSearchInput().value;
    model.setDisplayedItems(filterTabs(tabs, query));
  };

  var processEnter = function(event) {
    if (model.hasItems()) {
      gotoTab(model.getHighlightedItem().tab);
    }
  };

  var processUpArrow = function(event) {
    model.decrementIndexIfPossible();
  };

  var processDownArrow = function(event) {
    model.incrementIndexIfPossible();
  };

  var invokeByKeymap = function(keymap) {
    return function(event) {
      var handler = getMapping(keymap, event.keyCode);
      handler(event);
    };
  };

  // For character keys, keyup should be used so that text field value is changed.
  var onKeyUp = invokeByKeymap({
    13: noop, // Enter key
    38: noop, // Up arrow key
    40: noop, // Down arrow key
    "default": processInput,
  });

  // For keys like Enter and arrows, keydown feels more responsive.
  var onKeyDown = invokeByKeymap({
    13: processEnter, // Enter key
    38: processUpArrow, // Up arrow key
    40: processDownArrow, // Down arrow key
    "default": noop,
  });

  wireInputListeners(getSearchInput(), onKeyDown, onKeyUp);
};

var onTabsLoaded = function(allTabs) {
  model.setDisplayedItems(addEmptyIndices(allTabs));

  wireInput(allTabs);

  setFocusOnInput();
};

var onContentLoaded = function() {
  asyncGetTabs(onTabsLoaded);
};

document.addEventListener("DOMContentLoaded", onContentLoaded);
