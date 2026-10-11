import { fetchProducts } from "./api.js";

const STORAGE_KEY = "shoplite-preferences-v1";
const elements = {
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categorySelect"),
  sort: document.querySelector("#sortSelect"),
  count: document.querySelector("#resultsCount"),
  grid: document.querySelector("#productGrid"),
  loading: document.querySelector("#loadingState"),
  error: document.querySelector("#errorBanner"),
  errorMessage: document.querySelector("#errorMessage"),
  retry: document.querySelector("#retryButton"),
  reset: document.querySelector("#resetButton"),
  emptyReset: document.querySelector("#emptyResetButton"),
  empty: document.querySelector("#emptyState")
};

let allProducts = [];
let requestInProgress = false;

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      search: typeof saved.search === "string" ? saved.search : "",
      category: typeof saved.category === "string" ? saved.category : "all",
      sort: typeof saved.sort === "string" ? saved.sort : "featured"
    };
  } catch {
    return { search: "", category: "all", sort: "featured" };
  }
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      search: elements.search.value,
      category: elements.category.value,
      sort: elements.sort.value
    }));
  } catch (error) {
    // The app still works if browser storage is unavailable or full.
    console.warn("Could not save preferences:", error);
  }
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.grid.hidden = isLoading;
  if (isLoading) elements.empty.hidden = true;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.error.hidden = false;
}

function hideError() {
  elements.error.hidden = true;
}

function formatCategory(category) {
  return category.replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

function populateCategories(products) {
  const previousValue = elements.category.value;
  const categories = [...new Set(products.map((product) => product.category))].sort();
  elements.category.replaceChildren(new Option("All categories", "all"));
  for (const category of categories) {
    elements.category.add(new Option(formatCategory(category), category));
  }
  elements.category.value = categories.includes(previousValue) ? previousValue : "all";
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-image-wrap";
  const image = document.createElement("img");
  image.className = "product-image";
  image.src = product.image;
  image.alt = product.title;
  image.loading = "lazy";
  image.onerror = () => {
    image.alt = "Product image unavailable";
    image.style.display = "none";
    imageWrap.textContent = "Image unavailable";
  };
  imageWrap.append(image);

  const info = document.createElement("div");
  info.className = "product-info";
  const category = document.createElement("span");
  category.className = "category-pill";
  category.textContent = product.category;

  const title = document.createElement("h2");
  title.className = "product-title";
  title.textContent = product.title;

  const rating = document.createElement("p");
  rating.className = "rating";
  const rate = Number(product.rating?.rate || 0).toFixed(1);
  const count = Number(product.rating?.count || 0);
  rating.textContent = `★ ${rate} · ${count} reviews`;

  const bottom = document.createElement("div");
  bottom.className = "product-bottom";
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = `$${Number(product.price).toFixed(2)}`;

  const link = document.createElement("a");
  link.className = "buy-link";
  link.href = `https://fakestoreapi.com/products/${product.id}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "View item";
  link.setAttribute("aria-label", `View API details for ${product.title}`);

  bottom.append(price, link);
  info.append(category, title, rating, bottom);
  card.append(imageWrap, info);
  return card;
}

function getVisibleProducts() {
  const query = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;
  const sort = elements.sort.value;

  let visible = allProducts.filter((product) => {
    const matchesQuery = `${product.title} ${product.description} ${product.category}`
      .toLowerCase().includes(query);
    const matchesCategory = category === "all" || product.category === category;
    return matchesQuery && matchesCategory;
  });

  switch (sort) {
    case "price-low":
      visible.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      visible.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      visible.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
      break;
    case "name":
      visible.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      visible.sort((a, b) => a.id - b.id);
  }
  return visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  elements.grid.replaceChildren(...visible.map(createProductCard));
  elements.count.textContent = `Showing ${visible.length} of ${allProducts.length} products`;
  elements.empty.hidden = visible.length !== 0;
  elements.grid.hidden = visible.length === 0;
  savePreferences();
}

async function loadProducts() {
  if (requestInProgress) return;
  requestInProgress = true;
  hideError();
  setLoading(true);
  elements.count.textContent = "Loading products…";
  elements.retry.disabled = true;

  try {
    allProducts = await fetchProducts();
    populateCategories(allProducts);
    setLoading(false);
    renderProducts();
  } catch (error) {
    setLoading(false);
    elements.grid.hidden = true;
    elements.count.textContent = "Products are unavailable";
    showError(error instanceof Error ? error.message : "An unexpected error occurred.");
  } finally {
    requestInProgress = false;
    elements.retry.disabled = false;
  }
}

function resetFilters() {
  elements.search.value = "";
  elements.category.value = "all";
  elements.sort.value = "featured";
  renderProducts();
}

function restorePreferences() {
  const preferences = readPreferences();
  elements.search.value = preferences.search;
  elements.sort.value = ["featured", "price-low", "price-high", "rating", "name"].includes(preferences.sort)
    ? preferences.sort : "featured";
  // Category is restored after categories have been populated.
  return preferences.category;
}

const savedCategory = restorePreferences();
elements.search.addEventListener("input", renderProducts);
elements.category.addEventListener("change", renderProducts);
elements.sort.addEventListener("change", renderProducts);
elements.reset.addEventListener("click", resetFilters);
elements.emptyReset.addEventListener("click", resetFilters);
elements.retry.addEventListener("click", loadProducts);

loadProducts().then(() => {
  if ([...elements.category.options].some((option) => option.value === savedCategory)) {
    elements.category.value = savedCategory;
    renderProducts();
  }
});
