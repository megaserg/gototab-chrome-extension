module pubsub {

  export type Callback = (...args: any[]) => any;

  class Topic<T> {
    constructor(
      public name: string,
      public arg: T) {}
  }

  export var topics = {
    // from model
    MODEL_ITEM_LIST_CHANGED: "modelItemListChanged",
    MODEL_ITEM_HIGHLIGHTED: "modelItemHighlighted",
    MODEL_ITEM_UNHIGHLIGHTED: "modelItemUnhighlighted",

    // from user actions (search field)
    SEARCH_TERM_CHANGED: "searchTermChanged",
    UP_ARROW_KEY_PRESSED: "upArrowKeyPressed",
    DOWN_ARROW_KEY_PRESSED: "downArrowKeyPressed",
    ENTER_KEY_PRESSED: "enterKeyPressed",

    // from user actions (mouse)
    ITEM_MOUSED_OVER: "itemMousedOver",
    ITEM_CLICKED: "itemClicked",
  }

  export class EventBus {
    private subscribers = {};

    public subscribe(topic: string, callback: Callback): void {
      if (!this.subscribers[topic]) {
        this.subscribers[topic] = [];
      }

      this.subscribers[topic].push(callback);
    }

    public subscribeSafe<T>(topic: Topic<T>, callback: (x: (typeof topic.arg)) => any): void {
      if (!this.subscribers[topic.name]) {
        this.subscribers[topic.name] = [];
      }

      this.subscribers[topic.name].push(callback);
    }

    public publish(topic: string, ...args: any[]): void {
      console.log(topic, args);
      for (var i in this.subscribers[topic]) {
        var callback = this.subscribers[topic][i];
        callback.apply(null, args);
      }
    }
  }
}
