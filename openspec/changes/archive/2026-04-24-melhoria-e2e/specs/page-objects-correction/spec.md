# Delta for Page Objects Correction

## ADDED Requirements

### Requirement: AdminCategoriesPage SHALL Have Complete Locators
The AdminCategoriesPage page object SHALL include all locators referenced in test scenarios.

#### Scenario: Category Description Input is Accessible
- GIVEN the admin is on the categories management page
- WHEN the page object accesses `categoryDescriptionInput`
- THEN the locator SHALL resolve to the correct input element
- AND the input SHALL allow filling category descriptions

### Requirement: AdminProductsPage SHALL Have Complete Locators and Methods
The AdminProductsPage page object SHALL include all locators and methods required by test scenarios.

#### Scenario: Product Description Input is Accessible
- GIVEN the admin is on the products management page
- WHEN the page object accesses `productDescriptionInput`
- THEN the locator SHALL resolve to the correct textarea or input element

#### Scenario: Product Category Select is Accessible
- GIVEN the admin is on the products management page
- WHEN the page object accesses `productCategorySelect`
- THEN the locator SHALL resolve to the correct select element
- AND options SHALL include all available categories

#### Scenario: Search Products Returns Count for Assertion
- GIVEN the admin products page is loaded
- WHEN `searchProducts(query)` is called
- THEN the method SHALL wait for the API response
- AND the test SHALL be able to assert on the returned product count

#### Scenario: Filter Products By Category Returns Count for Assertion
- GIVEN the admin products page is loaded
- WHEN `filterByCategory(categoryName)` is called
- THEN the method SHALL wait for the API response
- AND the test SHALL be able to assert on the filtered product count

### Requirement: AdminOrdersPage SHALL Have Complete Methods with Assertions
The AdminOrdersPage page object SHALL implement all methods with proper waiting and assertion support.

#### Scenario: Filter By Status Returns Results Count
- GIVEN the admin orders page is loaded
- WHEN `filterByStatus(status)` is called
- THEN the method SHALL wait for the API response to complete
- AND the test SHALL be able to assert on the filtered orders count

#### Scenario: Search By Customer Email Returns Results Count
- GIVEN the admin orders page is loaded
- WHEN `searchByCustomerEmail(email)` is called
- THEN the method SHALL wait for the API response to complete
- AND the test SHALL be able to assert on the matching orders

#### Scenario: Get Error Returns Non-Empty String on Error
- GIVEN the admin orders page has performed an operation that resulted in an error
- WHEN `getError()` is called
- THEN the method SHALL return the error message text
- AND the returned string SHALL be usable in assertions

#### Scenario: View Order Details Shows Order ID in Modal
- GIVEN the admin orders page is displaying a list of orders
- WHEN `viewOrderDetails(orderId)` is called
- THEN the order modal SHALL become visible
- AND the modal SHALL display the correct order ID

#### Scenario: Update Order Status Shows Success Confirmation
- GIVEN the admin orders page is displaying a list of orders
- WHEN `updateOrderStatus(orderId, newStatus)` is called
- THEN the system SHALL show a success confirmation
- AND the order status in the list SHALL reflect the new status

---

## MODIFIED Requirements

### Requirement: AdminOrdersPage Error Handling
The AdminOrdersPage page object SHALL properly surface error messages from failed operations.

#### Scenario: getError Method Returns Error Content (Modified)
- GIVEN an error has occurred on the admin orders page
- WHEN `getError()` is invoked
- THEN the method SHALL return the error message text from the errorMessage locator
- AND the returned value SHALL be a non-empty string when an error exists

---

## REMOVED Requirements

None.
