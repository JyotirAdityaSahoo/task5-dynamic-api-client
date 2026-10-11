const API_BASE_URL = "https://fakestoreapi.com";

/**
 * Fetch products from the FakeStore public REST API.
 * Throws a useful error if the server responds unsuccessfully or the request fails.
 */
export async function fetchProducts() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/products`, {
      headers: { Accept: "application/json" }
    });
  } catch {
    throw new Error("Network request failed. Check your internet connection.");
  }

  if (!response.ok) {
    throw new Error(`The API returned an error (${response.status}). Please try again.`);
  }

  const products = await response.json();
  if (!Array.isArray(products)) {
    throw new Error("The API returned data in an unexpected format.");
  }
  return products;
}
