describe("FuzzySearch", function() {

  var fuzzy = require('../out/FuzzySearch.js');

  it("should be able to rank items", function() {
    console.log(fuzzy);
    var scorer = new fuzzy.FuzzySearch("avi");
    var results = ["Hello world!", "Travis", "Appveyor"].sort(function(a, b) {
        return scorer.score(b) - scorer.score(a);
    });

    expect(results[0]).toBe("Travis");
  });

});
