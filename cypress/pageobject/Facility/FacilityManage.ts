class FacilityManage {
  clickCoverImage() {
    cy.get("#facility-coverimage").click({ force: true });
  }

  verifyUploadButtonVisible() {
    cy.get("#upload-cover-image").should("be.visible");
  }

  uploadCoverImage(fileName) {
    cy.get("#upload-cover-image")
      .selectFile(`cypress/fixtures/${fileName}`, { force: true })
      .wait(100); // Adjust the wait time as needed
  }

  clickSaveCoverImage() {
    cy.get("#save-cover-image").scrollIntoView();
    cy.get("#save-cover-image").click();
  }

  clickFacilityConfigureButton() {
    cy.get("#configure-facility").should("be.visible");
    cy.get("#configure-facility").click();
  }

  verifyMiddlewareAddressVisible() {
    cy.get("#middleware_address").should("be.visible");
  }

  clickButtonWithText(text) {
    cy.get("button#submit").contains(text).click();
  }

  checkErrorMessageVisibility(text) {
    cy.get(".error-text").contains(text).should("be.visible");
  }

  typeMiddlewareAddress(address) {
    cy.get("#middleware_address").click().clear().click().type(address);
  }

  typeHrfId(address) {
    cy.get("#hf_id").click().clear().click().type(address);
  }

  verifySuccessMessageVisibilityAndContent(text) {
    cy.get(".pnotify-text").should("be.visible").and("contain", text);
  }

  verifyMiddlewareAddressValue(expectedValue) {
    cy.get("#middleware_address").should("have.value", expectedValue);
  }

  verifyHrfIdValue(expectedValue) {
    cy.get("#hf_id").should("have.value", expectedValue);
  }
}
export default FacilityManage;
