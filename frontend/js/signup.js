
// Initialize Supabase
const supabaseUrl = 'https://amxecdqsspoamqbiwsfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteGVjZHFzc3BvYW1xYml3c2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTEzNDYsImV4cCI6MjA1OTA4NzM0Nn0.nvx892b6IVjOTp7LbMHMvHpK5rp7ikgCDrhSWadkvyo'; // Replace with your actual Supabase anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Handle signup form submission
const signupForm = document.querySelector("#signup-form");

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = e.target.first_name.value;
    const lastName = e.target.last_name.value;
    const email = e.target.email.value;
    const phoneNumber = e.target.phone_number.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirm_password.value;

    // Validate if passwords match
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    // Create user in Supabase Auth
    const { user, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                created_at: new Date().toISOString(),
            }
        }
    });

    if (authError) {
        console.error("Signup failed:", authError.message);
        alert("Signup error: " + authError.message);
        return;
    }

    // After the user is created, insert the user data into the users table
    const { data, error: dbError } = await supabase
        .from('users')
        .insert([{
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone_number: phoneNumber,
            created_at: new Date().toISOString(),
        }]);

    if (dbError) {
        console.error("User Already Registered!", dbError.message);
        alert("User Already Registered!");
        return;
    }

    alert("Account created successfully! Please check your email to verify your account.");
    window.location.href = "login.html"; // Redirect to login page
});
