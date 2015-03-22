describe("FuzzySearch", function() {
  
  require('../gototab/FuzzySearch.js');

  it("should be able to rank items", function() {
    var scorer = new FuzzySearch("avi");
    var results = ["Hello world!", "Travis", "Appveyor"].sort(function(a, b) {
        return scorer.score(b) - scorer.score(a);
    });

    expect(results[0]).toBe("Travis");
  });

});
