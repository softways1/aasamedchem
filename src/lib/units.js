// Units configuration and conversion helper

export const UNITS_CONFIG = {
  // Mass dimension
  g: { dimension: 'mass', factor: 1, name: 'Grams', symbol: 'g' },
  kg: { dimension: 'mass', factor: 1000, name: 'Kilograms', symbol: 'kg' },
  
  // Volume dimension
  mL: { dimension: 'volume', factor: 1, name: 'Milliliters', symbol: 'mL' },
  L: { dimension: 'volume', factor: 1000, name: 'Liters', symbol: 'L' },
  
  // Count dimension
  items: { dimension: 'count', factor: 1, name: 'Items', symbol: 'items' }
};

/**
 * Get the dimension of a unit (mass, volume, count)
 * @param {string} unit 
 * @returns {string}
 */
export function getUnitDimension(unit) {
  const config = UNITS_CONFIG[unit];
  if (!config) throw new Error(`Unsupported unit: ${unit}`);
  return config.dimension;
}

/**
 * Check if two units are in the same dimension
 * @param {string} unit1 
 * @param {string} unit2 
 * @returns {boolean}
 */
export function areUnitsCompatible(unit1, unit2) {
  try {
    return getUnitDimension(unit1) === getUnitDimension(unit2);
  } catch (e) {
    return false;
  }
}

/**
 * Get list of all units compatible with a given base unit
 * @param {string} baseUnit 
 * @returns {string[]}
 */
export function getCompatibleUnits(baseUnit) {
  const dim = getUnitDimension(baseUnit);
  return Object.keys(UNITS_CONFIG).filter(u => UNITS_CONFIG[u].dimension === dim);
}

/**
 * Safe floating-point rounding utility
 * @param {number} num 
 * @param {number} precision 
 * @returns {number}
 */
export function roundToPrecision(num, precision = 6) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  
  // If the number is smaller than the smallest representable decimal at this precision, round to 0
  if (Math.abs(num) < Math.pow(10, -precision) / 2) return 0;
  
  const factor = Math.pow(10, precision);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Convert quantity from one unit to another
 * @param {number} qty 
 * @param {string} fromUnit 
 * @param {string} toUnit 
 * @returns {number}
 */
export function convertQuantity(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return roundToPrecision(qty);
  
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Incompatible units: cannot convert from ${fromUnit} to ${toUnit}`);
  }
  
  const fromFactor = UNITS_CONFIG[fromUnit].factor;
  const toFactor = UNITS_CONFIG[toUnit].factor;
  
  // Convert to common base, then to target unit
  const result = qty * (fromFactor / toFactor);
  return roundToPrecision(result, 6);
}

/**
 * Calculate price based on quantity in ordered unit and base unit price
 * @param {number} qty 
 * @param {string} orderedUnit 
 * @param {string} baseUnit 
 * @param {number} pricePerBaseUnit 
 * @returns {object} { convertedQuantity, totalPrice }
 */
export function calculateItemPrice(qty, orderedUnit, baseUnit, pricePerBaseUnit) {
  const convertedQuantity = convertQuantity(qty, orderedUnit, baseUnit);
  const totalPriceRaw = convertedQuantity * pricePerBaseUnit;
  return {
    convertedQuantity,
    totalPrice: roundToPrecision(totalPriceRaw, 2) // displayable price in INR rounded to 2 decimal places
  };
}
