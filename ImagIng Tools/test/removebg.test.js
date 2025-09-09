const bgObject = require("../RemoveBG");

describe("Background Removal", () => {
  it("should remove the background from an image and return the new image", async () => {
    const result = await bgObject.removeBackgroundFunc("path/to/image.jpg");
    expect(result.image).toBeDefined();
  });
});