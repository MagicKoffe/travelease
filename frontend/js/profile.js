// Initialize Supabase
const supabaseUrl = 'https://amxecdqsspoamqbiwsfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteGVjZHFzc3BvYW1xYml3c2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTEzNDYsImV4cCI6MjA1OTA4NzM0Nn0.nvx892b6IVjOTp7LbMHMvHpK5rp7ikgCDrhSWadkvyo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Pull stored user from localStorage
const storedUser = JSON.parse(localStorage.getItem("user"));
if (!storedUser) {
  // not logged in → send back to login
  window.location.replace("login.html");
} else {
  // 1) Greet by email or first name
  const welcomeEl = document.getElementById("welcome-message");
  const firstName = storedUser.user_metadata?.first_name || "";
  welcomeEl.textContent = firstName
    ? `Welcome, ${firstName}!`
    : `Welcome, ${storedUser.email}!`;

  // 2) Show personal details
  const detailsEl = document.getElementById("user-details");
  detailsEl.innerHTML = `
    <p><strong>First Name:</strong> ${storedUser.user_metadata?.first_name || "Not Available"}</p>
    <p><strong>Last Name:</strong> ${storedUser.user_metadata?.last_name || "Not Available"}</p>
    <p><strong>Email:</strong> ${storedUser.email}</p>
    <p><strong>Phone Number:</strong> ${storedUser.user_metadata?.phone_number || "Not Available"}</p>
  `;
}

// 3) Wire up logout button
document.querySelector(".logout-btn").addEventListener("click", async e => {
  e.preventDefault();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error.message);
    alert("Error logging out. Please try again.");
  } else {
    localStorage.removeItem("user");
    // show logout confirmation
    window.location.replace("logoutconfirmation.html");
  }
});