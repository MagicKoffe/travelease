// Initialize Supabase
const supabaseUrl = 'https://amxecdqsspoamqbiwsfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteGVjZHFzc3BvYW1xYml3c2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTEzNDYsImV4cCI6MjA1OTA4NzM0Nn0.nvx892b6IVjOTp7LbMHMvHpK5rp7ikgCDrhSWadkvyo'; // Replace with your actual Supabase anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const loginForm = document.querySelector("#login-form");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    // Authenticate user
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login failed:", error.message);
        alert("Login error: " + error.message);
    } else {
        // Save the user object in localStorage for later retrieval
        localStorage.setItem("user", JSON.stringify(data.user));
        alert("Login successful!");
        window.location.href = "loginconfirmation.html"; // Redirect to dashboard
    }
});
