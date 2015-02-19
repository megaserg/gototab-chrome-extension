/**
 * Gets all tabs.
 *
 * @param {function(array[Tab])} processTabs
 *   Called with the list of tabs.
 */
function getTabs(processTabs) {
  var queryInfo = {
    // To limit the search to the current window, uncomment the following line.
    // currentWindow: true
  };

  chrome.tabs.query(queryInfo, processTabs);
}

var getSearchInput = function() {
  return document.getElementById("searchInput");
}

var getTabListDiv = function() {
  return document.getElementById("tabListDiv");
}

var setFocusOnInput = function() {
  getSearchInput().focus();
};

var renderTabList = function(html) {
  getTabListDiv().innerHTML = html;
};

var drawTabs = function(tabs) {
  var n = tabs.length;

  var listhtml = "";
  for (var i = 0; i < n; i++) {
    listhtml +=
      "<div>" +
      "<img src='" + tabs[i].favIconUrl + "' class='favicon' />" +
      tabs[i].title +
      "</div>";
  }

  renderTabList(listhtml);
};

var filterTabs = function(tabs, query) {
  var lowercaseQuery = query.toLowerCase();
  var filteredTabs = tabs.filter(function(tab) {
    return tab.title.toLowerCase().indexOf(lowercaseQuery) != -1;
  });
  return filteredTabs;
}

var drawFilteredTabs = function(tabs, query) {
  drawTabs(filterTabs(tabs, query));
};


var gotoTab = function(tab) {
  chrome.tabs.update(tab.id, {active: true});
  chrome.windows.update(tab.windowId, {focused: true});
}

/**
 * Wires up the function to react on the input.
 *
 * @param {function(event)} processTextValue
 *   Called when user inputs something.
 * @param {function(event)} processEnter
 *   Called when user presses Enter.
 */
var wireOnChangeListener = function(processTextValue, processEnter) {
  var onChange = function(event) {
    if (event.keyCode == 13) { // Enter key
      processEnter(event);
    } else {
      processTextValue(event);
    }
  }

  // TODO: is keyup the correct event?
  getSearchInput().addEventListener("keyup", onChange, false);
};

document.addEventListener("DOMContentLoaded", function() {
  getTabs(function(tabs) {

    var processText = function(event) {
      var query = getSearchInput().value;
      drawFilteredTabs(tabs, query);
    };

    var processEnter = function(event) {
      var query = getSearchInput().value;

      // TODO: instead, open the currently highlighted tab
      var filteredTabs = filterTabs(tabs, query);
      if (filteredTabs.length > 0) {
        gotoTab(filteredTabs[0]);
      }
    };

    wireOnChangeListener(processText, processEnter);

    setFocusOnInput();

    drawTabs(tabs);
  });
});
