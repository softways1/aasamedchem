import { convertQuantity, calculateItemPrice, areUnitsCompatible } from '../units.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('--- Starting Unit Conversion Tests ---');

  // Test Compatibility
  assert(areUnitsCompatible('g', 'kg') === true, 'g and kg should be compatible');
  assert(areUnitsCompatible('mL', 'L') === true, 'mL and L should be compatible');
  assert(areUnitsCompatible('items', 'items') === true, 'items and items should be compatible');
  assert(areUnitsCompatible('kg', 'L') === false, 'kg and L should not be compatible');
  assert(areUnitsCompatible('g', 'items') === false, 'g and items should not be compatible');
  console.log('✓ Compatibility checks passed');

  // Test Mass Conversion
  assert(convertQuantity(1.5, 'kg', 'g') === 1500, '1.5 kg should be 1500 g');
  assert(convertQuantity(2500, 'g', 'kg') === 2.5, '2500 g should be 2.5 kg');
  assert(convertQuantity(0.001, 'kg', 'g') === 1, '0.001 kg should be 1 g');
  assert(convertQuantity(0.000125, 'g', 'kg') === 0.000000, '0.000125 g converted to kg is 0.000000125 - rounded to 6 decimals is 0'); // rounded to 6 decimal precision
  assert(convertQuantity(0.000125, 'kg', 'g') === 0.125, '0.000125 kg should be 0.125 g');
  console.log('✓ Mass conversions passed');

  // Test Volume Conversion
  assert(convertQuantity(2.5, 'L', 'mL') === 2500, '2.5 L should be 2500 mL');
  assert(convertQuantity(500, 'mL', 'L') === 0.5, '500 mL should be 0.5 L');
  console.log('✓ Volume conversions passed');

  // Test Count Conversion
  assert(convertQuantity(10, 'items', 'items') === 10, '10 items should convert to 10 items');
  console.log('✓ Count conversions passed');

  // Test Price Calculation
  // 1.5 kg ordered, base unit is g, price per base unit (g) is 0.5 INR.
  // 1.5 kg -> 1500 g. Total Price = 1500 * 0.5 = 750.00 INR.
  const calc1 = calculateItemPrice(1.5, 'kg', 'g', 0.5);
  assert(calc1.convertedQuantity === 1500, 'Converted qty should be 1500 g');
  assert(calc1.totalPrice === 750.00, 'Total price should be 750.00 INR');

  // 500 mL ordered, base unit is L, price per base unit (L) is 150.00 INR.
  // 500 mL -> 0.5 L. Total Price = 0.5 * 150 = 75.00 INR.
  const calc2 = calculateItemPrice(500, 'mL', 'L', 150);
  assert(calc2.convertedQuantity === 0.5, 'Converted qty should be 0.5 L');
  assert(calc2.totalPrice === 75.00, 'Total price should be 75.00 INR');

  console.log('✓ Price calculations passed');
  console.log('--- All Unit Tests Passed Successfully ---');
}

try {
  runTests();
} catch (error) {
  console.error('Test Suite Failed:', error.message);
  process.exit(1);
}
