// =================================
// SUPABASE CONNECTION
// =================================

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";

const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =================================
// GLOBAL VARIABLES
// =================================

let products = [];
let selectedProduct = null;
let authMode = "login";


// =================================
// LOAD PRODUCTS
// =================================

async function loadProducts() {

    const { data, error } = await db
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("id", { ascending: false });

    if (error) {
        console.error(error);
        document.getElementById("books-list").innerHTML =
            "<p>Unable to load books.</p>";

        document.getElementById("coins-list").innerHTML =
            "<p>Unable to load coins.</p>";

        return;
    }

    products = data || [];

    displayProducts();
}


// =================================
// DISPLAY PRODUCTS
// =================================

function displayProducts() {

    const books = products.filter(
        item => item.category === "book"
    );

    const coins = products.filter(
        item => item.category === "coins"
    );

    renderProducts(books, "books-list");
    renderProducts(coins, "coins-list");
}


function renderProducts(items, elementId) {

    const container = document.getElementById(elementId);

    if (items.length === 0) {
        container.innerHTML =
            "<p>No products available yet.</p>";
        return;
    }

    container.innerHTML = items.map(item => `

        <div class="product-card">

            <img
                src="${escapeHTML(item.image_url || 'https://placehold.co/500x350/151515/e8b84c?text=7BOOKS')}"
                alt="${escapeHTML(item.name)}"
            >

            <div class="product-info">

                <h3>${escapeHTML(item.name)}</h3>

                <p>${escapeHTML(item.description || "")}</p>

                <div class="price">
                    $${Number(item.price).toFixed(2)}
                </div>

                <button
                    class="buy-btn"
                    onclick="buyProduct(${item.id})"
                >
                    Buy Now
                </button>

            </div>

        </div>

    `).join("");
}


// =================================
// HTML TEXT PROTECTION
// =================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

}


// =================================
// AUTHENTICATION
// =================================

function showAuth(mode) {

    authMode = mode;

    document.getElementById("auth-section").style.display = "flex";

    document.getElementById("auth-title").textContent =
        mode === "login" ? "Welcome Back" : "Create Account";

    document.getElementById("auth-submit").textContent =
        mode === "login" ? "Login" : "Sign Up";

    document.getElementById("auth-name").style.display =
        mode === "login" ? "none" : "block";

    document.getElementById("auth-message").textContent = "";
}


function closeAuth() {

    document.getElementById("auth-section").style.display = "none";

}


// =================================
// SIGNUP AND LOGIN
// =================================

document.getElementById("auth-form").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const email =
            document.getElementById("auth-email").value.trim();

        const password =
            document.getElementById("auth-password").value;

        const name =
            document.getElementById("auth-name").value.trim();

        const message =
            document.getElementById("auth-message");

        message.textContent = "Please wait...";

        let result;

        if (authMode === "signup") {

            result = await db.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

        } else {

            result = await db.auth.signInWithPassword({
                email,
                password
            });

        }

        if (result.error) {

            message.textContent = result.error.message;

        } else {

            message.textContent =
                authMode === "signup"
                ? "Account created! Check your email if confirmation is required."
                : "Login successful!";

            if (authMode === "login") {
                setTimeout(closeAuth, 1000);
            }

        }

    }
);


// =================================
// CHECK USER
// =================================

async function getCurrentUser() {

    const { data } = await db.auth.getUser();

    return data.user;

}


// =================================
// BUY PRODUCT
// =================================

async function buyProduct(id) {

    const user = await getCurrentUser();

    if (!user) {

        alert("Please login before placing an order.");

        showAuth("login");

        return;
    }

    selectedProduct = products.find(
        item => item.id === id
    );

    if (!selectedProduct) return;

    document.getElementById("cart-items").innerHTML = `
        <h3>${escapeHTML(selectedProduct.name)}</h3>
        <p>Price: $${Number(selectedProduct.price).toFixed(2)}</p>
    `;

    document.getElementById("customer-name").value =
        user.user_metadata?.full_name || "";

    document.getElementById("checkout-section").style.display =
        "flex";

}


// =================================
// CLOSE CHECKOUT
// =================================

function closeCheckout() {

    document.getElementById("checkout-section").style.display =
        "none";

}


// =================================
// PLACE ORDER
// =================================

document.getElementById("checkout-form").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const user = await getCurrentUser();

        if (!user || !selectedProduct) {

            alert("Please login again.");

            return;
        }

        const name =
            document.getElementById("customer-name").value.trim();

        const contact =
            document.getElementById("customer-contact").value.trim();

        const message =
            document.getElementById("order-message");

        message.textContent = "Submitting your order...";

        const { error } = await db
            .from("orders")
            .insert({

                user_id: user.id,

                product_id: selectedProduct.id,

                customer_name: name,

                contact: contact,

                quantity: 1,

                total_price: selectedProduct.price,

                status: "pending"

            });

        if (error) {

            message.textContent = error.message;

        } else {

            message.textContent =
                "Your order was submitted successfully!";

            selectedProduct = null;

            setTimeout(closeCheckout, 2000);

        }

    }
);


// =================================
// AUTH STATE
// =================================

db.auth.onAuthStateChange((event, session) => {

    console.log("Authentication status:", event);

});


// =================================
// START WEBSITE
// =================================

loadProducts();