(function () {
  "use strict";

  var defaultUsers = [
    { username: "quanly", password: "quanly", role: "quanly", name: "Quản lý nhà thuốc" },
    { username: "banthuoc", password: "banthuoc", role: "banthuoc", name: "Nhân viên bán thuốc" },
    { username: "admin", password: "admin", role: "admin", name: "Quản trị viên" }
  ];

  function qs(selector) {
    return document.querySelector(selector);
  }

  function getRegisteredUsers() {
    try {
      return JSON.parse(localStorage.getItem("pharmacare_users") || "[]");
    } catch (error) {
      return [];
    }
  }

  function saveRegisteredUsers(users) {
    localStorage.setItem("pharmacare_users", JSON.stringify(users));
  }

  function showAlert(type, message) {
    var target = qs("#authAlert");
    if (!target) return;
    target.className = "alert show " + (type === "success" ? "alert-success" : "alert-error");
    target.textContent = message;
  }

  function nextUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("next");
  }

  function bindLogin() {
    var form = qs("#loginForm");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var account = qs("#account").value.trim();
      var password = qs("#password").value;
      var users = defaultUsers.concat(getRegisteredUsers());
      var user = users.find(function (item) {
        return (item.username === account || item.email === account) && item.password === password;
      });

      if (!user) {
        showAlert("error", "Tài khoản hoặc mật khẩu chưa đúng.");
        return;
      }

      window.PharmaCare.setSession({
        username: user.username || user.email,
        name: user.name,
        role: user.role,
        loggedAt: new Date().toISOString()
      });

      showAlert("success", "Đăng nhập thành công. Đang chuyển vào hệ thống.");
      window.setTimeout(function () {
        window.location.href = nextUrl() || window.PharmaCare.dashboardFor(user.role);
      }, 450);
    });
  }

  function bindRegister() {
    var form = qs("#registerForm");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = qs("#fullName").value.trim();
      var email = qs("#email").value.trim().toLowerCase();
      var phone = qs("#phone").value.trim();
      var password = qs("#newPassword").value;
      var confirm = qs("#confirmPassword").value;
      var users = getRegisteredUsers();

      if (!name || !email || !phone || !password) {
        showAlert("error", "Vui lòng nhập đầy đủ thông tin đăng ký.");
        return;
      }

      if (password.length < 6) {
        showAlert("error", "Mật khẩu cần tối thiểu 6 ký tự.");
        return;
      }

      if (password !== confirm) {
        showAlert("error", "Mật khẩu xác nhận chưa khớp.");
        return;
      }

      var exists = users.some(function (item) { return item.email === email; });
      if (exists) {
        showAlert("error", "Email này đã được đăng ký trong hệ thống.");
        return;
      }

      users.push({
        username: email,
        email: email,
        password: password,
        phone: phone,
        name: name,
        role: "banthuoc"
      });
      saveRegisteredUsers(users);
      showAlert("success", "Đăng ký thành công. Bạn có thể đăng nhập bằng email vừa tạo.");
      form.reset();
    });
  }

  function bindSocialButtons() {
    document.querySelectorAll("[data-social-login]").forEach(function (button) {
      button.addEventListener("click", function () {
        showAlert("success", "Nút đăng nhập này đã được đặt sẵn cho giai đoạn kết nối sau.");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindLogin();
    bindRegister();
    bindSocialButtons();
  });
})();
