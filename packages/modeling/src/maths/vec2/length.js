/**
 * Calculates the length of the given vector.
 *
 * @param {vec2} vector - vector of reference
 * @returns {Number} length
 * @alias module:modeling/maths/vec2.length
 */
const length = (vector) => Math.hypot(vector[0], vector[1])

module.exports = length
