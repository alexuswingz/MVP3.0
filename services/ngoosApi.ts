/**
 * Stub for vine-tracker NgoosAPI compatibility.
 * Returns mock data - replace with real API when available.
 */

export async function getTpsPlanning() {
  return {
    success: true,
    products: [],
  };
}

export async function getProductDetails(asin: string) {
  return {
    product_name: '',
    brand_name: '',
    size: '',
    child_asin: asin,
    image_url: null,
    units_to_make: 0,
    algorithm: '',
  };
}

const NgoosAPI = { getTpsPlanning, getProductDetails };
export default NgoosAPI;
