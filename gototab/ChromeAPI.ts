declare var chrome: any;

module chromeApi {
  export interface ChromeTab {
    id: number;
    windowId: number;
    title: string;
    url: string;
    favIconUrl: string;
  }

  export var gotoTab = function(tabId: number, windowId: number): void {
    chrome.tabs.update(tabId, {active: true});
    chrome.windows.update(windowId, {focused: true});
  };

  var openUrl = function(url: string): void {
    chrome.tabs.create({
      "url": url
    }, function(tab) {});
  };

  export var openHistory = function(): void {
    openUrl("chrome://history");
  };

  export var openDownloads = function(): void {
    openUrl("chrome://downloads");
  };

  /**
   * Fetches the list of all tabs.
   *
   * @param {function(tabs: ChromeTab[])} processTabs
   *   Called with the list of tabs.
   */
  export var asyncGetTabs = function(processTabs: (tabs: ChromeTab[]) => void) {
    var queryInfo = {
      // To limit the search to the current window, uncomment the following line.
      // currentWindow: true
    };

    chrome.tabs.query(queryInfo, processTabs);
  };
}
