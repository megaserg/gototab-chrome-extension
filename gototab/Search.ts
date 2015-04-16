/// <reference path="Model.ts" />
/// <reference path="FuzzySearch.ts" />

module search {
  var caseInsensitiveStringIndicizer = function(query: string): (string) => model.AttributedString {
    // Workaround for empty search term
    if (query.length == 0) {
      return function(text: string): model.AttributedString {
        return new model.AttributedString(text, []);
      };
    }

    var lcquery = query.toLowerCase();

    return function(text: string): model.AttributedString {
      var lctext = text.toLowerCase();
      var start = 0, m = lcquery.length;
      var index, indices = [];
      while ((index = lctext.indexOf(lcquery, start)) > -1) {
        indices.push([index, index + m]);
        start = index + m;
      }
      return new model.AttributedString(text, indices);
    };
  };

  var scoreItems = function<I extends model.Item>(
      items: I[],
      matchesQuery: (I) => boolean,
      scoreComparator: (a: I, b: I) => number): I[] {
    return items.filter(matchesQuery).sort(scoreComparator);
  }

  var indicizeItems = function<I extends model.Item, DI extends model.DisplayedItem>(items: I[], itemIndicizer: (I) => DI) {
    return items.map(itemIndicizer);
  };

  var filterItems = function<I extends model.Item, DI extends model.DisplayedItem>(
      items: I[],
      query: string,
      queryMatcherProvider: (RegExp) => ((I) => boolean),
      scorerProvider: (scoreFunction: (string) => number) => ((I) => number),
      itemIndicizer: (stringIndicizer: (string) => model.AttributedString) => ((I) => DI)): DI[] {

    var searchRegex: RegExp = fuzzy.filterRegex(query);
    var matchesQuery: (I) => boolean = queryMatcherProvider(searchRegex);

    var stringScorer: fuzzy.FuzzySearch = new fuzzy.FuzzySearch(query);
    var stringScoreFunction: (string) => number = function(s: string): number {
      return stringScorer.score(s, null);
    };
    var scoreItemFunction: (I) => number = scorerProvider(stringScoreFunction);
    var scoreComparator: (a: I, b: I) => number = function(a: I, b: I): number {
      return scoreItemFunction(b) - scoreItemFunction(a);
    };

    return indicizeItems(
        scoreItems(items, matchesQuery, scoreComparator),
        itemIndicizer(caseInsensitiveStringIndicizer(query)));
  }

  export var filterTabItems = function(tabItems: model.TabItem[], query: string): model.DisplayedTabItem[] {

    var tabQueryMatcherProvider = function(matchRegex: RegExp) {
      return function(item: model.TabItem): boolean {
        return matchRegex.test(item.title) || matchRegex.test(item.url);
      };
    };

    var tabScorerProvider = function(scoreFunction: (string) => number) {
      return function(item: model.TabItem): number {
        return Math.max(scoreFunction(item.title), scoreFunction(item.url));
      };
    };

    var tabItemIndicizer =
        function(stringIndicizer: (string) => model.AttributedString): (tabItem: model.TabItem) => model.DisplayedTabItem {
          return function(tabItem: model.TabItem): model.DisplayedTabItem {
            return new model.DisplayedTabItem(
                stringIndicizer(tabItem.title),
                stringIndicizer(tabItem.url),
                tabItem.faviconUrl,
                tabItem.action);
          };
        };

    return filterItems<model.TabItem, model.DisplayedTabItem>(
        tabItems,
        query,
        tabQueryMatcherProvider,
        tabScorerProvider,
        tabItemIndicizer);
  }

  export var filterCommandItems = function(commandItems: model.CommandItem[], query: string): model.DisplayedCommandItem[] {
    var cmdQueryMatcherProvider = function(matchRegex: RegExp) {
      return function(item: model.CommandItem): boolean {
        return matchRegex.test(item.name);
      };
    };

    var cmdScorerProvider = function(scoreFunction: (string) => number) {
      return function(item: model.CommandItem): number {
        return scoreFunction(item.name);
      };
    };

    var cmdItemIndicizer =
        function(stringIndicizer: (string) => model.AttributedString): (cmdItem: model.CommandItem) => model.DisplayedCommandItem {
          return function(cmdItem: model.CommandItem): model.DisplayedCommandItem {
            return new model.DisplayedCommandItem(
                stringIndicizer(cmdItem.name),
                cmdItem.shortcut,
                cmdItem.action);
          };
        };

    return filterItems<model.CommandItem, model.DisplayedCommandItem>(
        commandItems,
        query,
        cmdQueryMatcherProvider,
        cmdScorerProvider,
        cmdItemIndicizer);
  }
}
