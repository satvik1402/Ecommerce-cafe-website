 // Import the functions you need from the SDKs you need
 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
 import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
 import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

 // TODO: Add SDKs for Firebase products that you want to use
 // https://firebase.google.com/docs/web/setup#available-libraries

 // Your web app's Firebase configuration
 // For Firebase JS SDK v7.20.0 and later, measurementId is optional
 const firebaseConfig = {
   apiKey: "AIzaSyDDnhv4L0oIZ_CysKOB93spUBDLZJ6Z3wE",
   authDomain: "cafena-bdfc5.firebaseapp.com",
   projectId: "cafena-bdfc5",
   storageBucket: "cafena-bdfc5.firebasestorage.app",
   messagingSenderId: "18417998740",
   appId: "1:18417998740:web:2dcff1c25d1bca8b9e8d81",
   measurementId: "G-FCCLQ9SVMR"
 };

 // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const analytics = getAnalytics(app);
 const auth = getAuth(app);

 
 const submit=document.querySelector('.btn');
 submit.addEventListener('click',function(event){
    event.preventDefault()
    
 const email=document.getElementById('email').value;
 const password=document.querySelector('.password').value;
 signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    alert('login in...')
    window.location.href='index.html';
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert(errorMessage)
    // ..
  });

 })

 firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        // If no user is logged in, redirect to login page
        window.location.href = "cafe.html";
    }
});