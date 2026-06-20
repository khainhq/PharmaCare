(function () {
  "use strict";

  var base = window.PHARMA_BASE || "";
  var sessionKey = "pharmacare_session";

  var roles = {
    quanly: "Quản lý",
    banthuoc: "Dược sĩ bán thuốc",
    admin: "Quản trị viên"
  };

  var dashboards = {
    quanly: "pages/tong-quan/quan-ly.html",
    banthuoc: "pages/tong-quan/ban-thuoc.html",
    admin: "pages/tong-quan/admin.html"
  };

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
  }

  function number(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function asset(path) {
    return base + path;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || "null");
    } catch (error) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(sessionKey);
  }

  function dashboardFor(role) {
    return asset(dashboards[role] || dashboards.banthuoc);
  }

  function currentRelativeUrl() {
    return window.location.href;
  }

  function requireAuth() {
    if (document.body.dataset.requiresAuth !== "true") {
      return getSession();
    }

    var session = getSession();
    if (!session) {
      window.location.replace(asset("auth/login.html?next=" + encodeURIComponent(currentRelativeUrl())));
      return null;
    }

    var allow = (document.body.dataset.roles || "").split(",").filter(Boolean);
    if (allow.length && allow.indexOf(session.role) === -1) {
      window.location.replace(dashboardFor(session.role));
      return null;
    }

    return session;
  }

  function icon(name) {
    var icons = {
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 3.5 3.5"/>',
      chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V9"/><path d="M12 16V6"/><path d="M16 16v-4"/>',
      cart: '<path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
      box: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
      file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h5"/><path d="M10 13h6M10 17h6"/>',
      wallet: '<path d="M4 7h16v12H4z"/><path d="M16 11h4v4h-4z"/><path d="M4 7l11-4 2 4"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>',
      alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      minus: '<path d="M5 12h14"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.check) + "</svg>";
  }

  function statusClass(text) {
    if (/hủy|hết|cần|nguy/i.test(text || "")) return "status-danger";
    if (/chờ|sắp|thấp|tạm/i.test(text || "")) return "status-warn";
    return "status-ok";
  }

  function stockStatus(product) {
    if (product.stock <= 0) return "Hết hàng";
    if (product.stock <= 15) return "Sắp hết";
    return "Còn hàng";
  }

  function expiryStatus(product) {
    var now = new Date();
    var expiry = new Date(product.expiry + "T00:00:00");
    var days = Math.ceil((expiry - now) / 86400000);
    if (days < 0) return "Đã hết hạn";
    if (days <= 45) return "Sắp hết hạn";
    return "Còn hạn";
  }

  function loadData() {
    return fetch(asset("assets/data/pharmacare.json"), { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Không tải được dữ liệu");
        return response.json();
      })
      .catch(function () {
        return {
          categories: [],
          products: [],
          invoices: [],
          finance: [],
          employees: [],
          activities: []
        };
      });
  }

  function renderSidebar(session) {
    var sidebar = qs("#sidebar");
    if (!sidebar || !session) return;

    var role = session.role;
    var links = [
      { title: "Tổng quan", icon: "chart", href: dashboards[role], active: "tong-quan", roles: ["quanly", "banthuoc", "admin"] },
      { title: "Bán hàng", icon: "cart", href: "pages/ban-hang/pos.html", active: "ban-hang", roles: ["quanly", "banthuoc", "admin"] },
      { title: "Sản phẩm", icon: "box", href: "pages/san-pham/danh-muc.html", active: "san-pham", roles: ["quanly", "banthuoc", "admin"] },
      { title: "Kho hàng", icon: "alert", href: "pages/kho/ton-kho.html", active: "kho", roles: ["quanly", "admin"] },
      { title: "Hóa đơn", icon: "file", href: "pages/hoa-don/danh-sach.html", active: "hoa-don", roles: ["quanly", "banthuoc", "admin"] },
      { title: "Tài chính", icon: "wallet", href: "pages/tai-chinh/thu-chi.html", active: "tai-chinh", roles: ["quanly", "admin"] },
      { title: "Nhân viên", icon: "users", href: "pages/nhan-vien/danh-sach.html", active: "nhan-vien", roles: ["quanly", "admin"] },
      { title: "Báo cáo", icon: "chart", href: "pages/bao-cao/tong-quan.html", active: "bao-cao", roles: ["quanly", "admin"] },
      { title: "Quản trị", icon: "shield", href: "pages/quan-tri/nguoi-dung.html", active: "quan-tri", roles: ["admin"] }
    ];

    var active = document.body.dataset.nav;
    var html = [
      '<div class="sidebar-inner">',
      '<a class="brand" href="' + dashboardFor(role) + '"><img src="' + asset("assets/img/logo.svg") + '" alt="PharmaCare"></a>',
      '<div class="side-section-title">Phân hệ</div>',
      '<nav class="side-nav" aria-label="Điều hướng chính">'
    ];

    links.forEach(function (link) {
      if (link.roles.indexOf(role) === -1) return;
      html.push(
        '<a class="side-link ' + (active === link.active ? "active" : "") + '" href="' + asset(link.href) + '">' +
        '<span class="nav-icon">' + icon(link.icon) + '</span><span>' + link.title + '</span></a>'
      );
    });

    html.push(
      '</nav>',
      '<div class="sidebar-footer">',
      '<div class="role-card"><strong>' + (session.name || roles[role]) + '</strong><span>' + roles[role] + '</span></div>',
      '</div>',
      '</div>'
    );
    sidebar.innerHTML = html.join("");
  }

  function renderTopbar(session) {
    var topbar = qs("#topbar");
    if (!topbar || !session) return;
    var title = document.body.dataset.title || "PharmaCare";
    topbar.innerHTML =
      '<div class="topbar-left">' +
      '<button class="btn btn-light btn-icon mobile-menu" type="button" data-sidebar-toggle aria-label="Mở menu">' + icon("menu") + '</button>' +
      '<div class="topbar-title">' + title + '</div>' +
      '</div>' +
      '<div class="topbar-actions">' +
      '<span class="tag">' + roles[session.role] + '</span>' +
      '<button class="btn btn-light" type="button" data-logout>' + icon("logout") + '<span>Đăng xuất</span></button>' +
      '</div>';
  }

  function bindShellActions() {
    qsa("[data-logout]").forEach(function (button) {
      button.addEventListener("click", function () {
        clearSession();
        window.location.href = asset("auth/login.html");
      });
    });

    qsa("[data-sidebar-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        qs("#sidebar").classList.add("open");
        qs("#overlay").classList.add("show");
      });
    });

    var overlay = qs("#overlay");
    if (overlay) {
      overlay.addEventListener("click", function () {
        qs("#sidebar").classList.remove("open");
        overlay.classList.remove("show");
      });
    }
  }

  function hydrateStaticIcons() {
    qsa("[data-icon]").forEach(function (target) {
      target.innerHTML = icon(target.dataset.icon);
    });
  }

  function renderLanding(data) {
    var categoryGrid = qs("#categoryGrid");
    if (categoryGrid) {
      var cards = data.categories.map(function (category) {
        return '<button class="category-card category-card-button" type="button" data-category-filter="' + escapeHtml(category.name) + '">' +
          (category.image ? '<div class="category-image"><img src="' + asset(category.image) + '" alt="' + escapeHtml(category.name) + '" loading="lazy"></div>' : '<span class="feature-icon">' + icon("box") + '</span>') +
          '<h3>' + escapeHtml(category.name) + '</h3>' +
          '<p>' + escapeHtml(category.description) + '</p>' +
          '<div class="category-meta">' + category.groups.map(function (group) {
            return '<span class="tag">' + escapeHtml(group) + '</span>';
          }).join("") + '</div>' +
          '</button>';
      }).join("");
      categoryGrid.innerHTML = '<div class="category-carousel-track">' + cards + cards + '</div>';
    }

  }

  function unique(list) {
    return list.filter(function (item, index) {
      return item && list.indexOf(item) === index;
    });
  }

  function isAllLabel(value) {
    var normalized = String(value || "").trim().toLowerCase();
    var ascii = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !normalized || ascii === "tat ca" || /^t.t c.$/.test(normalized);
  }

  function productCategoryLabel(product) {
    var labels = [product.childCategory, product.subcategory, product.category];
    for (var index = 0; index < labels.length; index += 1) {
      if (!isAllLabel(labels[index])) return labels[index];
    }
    return product.category || "";
  }

  function productDetails(product) {
    var categoryLabel = productCategoryLabel(product);
    return [
      ["Số đăng ký", product.registrationNumber],
      ["Thành phần", product.ingredients],
      ["Dạng bào chế", product.dosageForm],
      ["Quy cách", product.specification],
      ["Danh mục", categoryLabel],
      ["Nhà sản xuất", product.manufacturer || product.brand || product.supplier],
      ["Nước sản xuất", product.origin],
      ["Hạn sử dụng", product.shelfLife || (product.expiry ? product.expiry.split("-").reverse().join("/") : "")]
    ].filter(function (item) {
      return item[1];
    }).map(function (item) {
      return '<div><dt>' + escapeHtml(item[0]) + '</dt><dd>' + escapeHtml(item[1]) + '</dd></div>';
    }).join("");
  }

  function productListCard(product) {
    var listedPrice = product.listedPrice && product.listedPrice > product.price ? '<span class="old-price">' + money(product.listedPrice) + '</span>' : "";
    var unit = product.unit ? " / " + product.unit.toLowerCase() : "";
    var groupLabel = productCategoryLabel(product);
    return '<article class="product-list-card" data-product-card data-stock-status="' + escapeHtml(stockStatus(product)) + '" data-text="' + escapeHtml([product.name, product.code, product.category, product.subcategory, product.childCategory, product.active, product.supplier].join(" ").toLowerCase()) + '">' +
      '<div class="product-list-image"><img src="' + asset(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy"></div>' +
      '<div class="product-list-body">' +
        '<span class="tag">' + escapeHtml(groupLabel) + '</span>' +
        '<h3>' + escapeHtml(product.name) + '</h3>' +
        '<p>' + escapeHtml(product.active || product.ingredients || product.specification || "") + '</p>' +
        '<details class="product-info-toggle"><summary>Thông tin sản phẩm</summary><dl class="product-detail-list">' + productDetails(product) + '</dl></details>' +
      '</div>' +
      '<footer><div><strong class="price">' + money(product.price) + unit + '</strong>' + listedPrice + '</div></footer>' +
      '</article>';
  }

  function renderProductBrowser(data) {
    var grid = qs("#landingProductGrid");
    var categorySelect = qs("#categoryProductSelect");
    var subcategoryPills = qs("#subcategoryPills");
    var loadMore = qs("#loadMoreProducts");
    if (!grid || !categorySelect || !subcategoryPills || !loadMore) return;

    var allSubcategory = "Tất cả";
    var categories = unique(data.categories.map(function (category) { return category.name; }));
    var state = {
      category: categories[0] || "",
      subcategory: allSubcategory,
      visible: 8
    };

    function categoryProducts() {
      return data.products.filter(function (product) {
        return product.category === state.category;
      });
    }

    function filteredProducts() {
      return categoryProducts().filter(function (product) {
        return state.subcategory === allSubcategory || product.subcategory === state.subcategory || product.childCategory === state.subcategory;
      });
    }

    function renderCategoryCards() {
      qsa("[data-category-filter]").forEach(function (button) {
        var active = button.dataset.categoryFilter === state.category;
        button.classList.toggle("is-active", active);
      });
    }

    function renderSubcategories() {
      var subcategories = [allSubcategory].concat(unique(categoryProducts().map(function (product) {
        return product.subcategory || product.category;
      }).filter(function (name) {
        return !isAllLabel(name);
      })));
      if (subcategories.indexOf(state.subcategory) === -1) {
        state.subcategory = allSubcategory;
      }
      subcategoryPills.innerHTML = subcategories.map(function (name) {
        return '<button class="filter-pill' + (name === state.subcategory ? ' is-active' : '') + '" type="button" data-subcategory-filter="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>';
      }).join("");
    }

    function render() {
      var products = filteredProducts();
      var visibleProducts = products.slice(0, state.visible);
      var title = qs("#productBrowserTitle");
      var count = qs("#productBrowserCount");
      if (title) title.textContent = state.category + (state.subcategory !== allSubcategory ? " - " + state.subcategory : "");
      if (count) count.textContent = number(products.length) + " sản phẩm";
      grid.innerHTML = visibleProducts.map(productListCard).join("") || emptyState("Chưa có sản phẩm trong nhóm này.");
      loadMore.hidden = state.visible >= products.length;
      renderCategoryCards();
      renderSubcategories();
      applyCatalogFilters();
    }

    categorySelect.innerHTML = categories.map(function (name) {
      return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
    }).join("");
    categorySelect.value = state.category;
    categorySelect.addEventListener("change", function () {
      state.category = categorySelect.value;
      state.subcategory = allSubcategory;
      state.visible = 8;
      render();
    });
    subcategoryPills.addEventListener("click", function (event) {
      var button = event.target.closest("[data-subcategory-filter]");
      if (!button) return;
      state.subcategory = button.dataset.subcategoryFilter;
      state.visible = 8;
      render();
    });
    qsa("[data-category-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.category = button.dataset.categoryFilter;
        state.subcategory = allSubcategory;
        state.visible = 8;
        categorySelect.value = state.category;
        render();
        var browser = qs("#productBrowser");
        if (browser) browser.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    loadMore.addEventListener("click", function () {
      state.visible += 8;
      render();
    });
    render();
  }

  function countWarnings(products) {
    return products.filter(function (product) {
      return product.stock <= 15 || expiryStatus(product) !== "Còn hạn";
    }).length;
  }

  function renderKpis(data) {
    var target = qs("#kpiGrid");
    if (!target) return;

    var revenue = data.invoices
      .filter(function (invoice) { return invoice.status !== "Đã hủy"; })
      .reduce(function (sum, invoice) { return sum + invoice.total; }, 0);
    var stock = data.products.reduce(function (sum, product) { return sum + product.stock; }, 0);
    var lowStock = data.products.filter(function (product) { return product.stock <= 15; }).length;
    var employees = data.employees.filter(function (employee) { return employee.status === "Đang làm"; }).length;

    target.innerHTML = [
      ["Doanh thu", money(revenue), "Cập nhật theo hóa đơn"],
      ["Tồn kho", number(stock), lowStock + " mặt hàng cần chú ý"],
      ["Nhân sự hoạt động", number(employees), "Theo phân quyền nội bộ"],
      ["Cảnh báo", number(countWarnings(data.products)), "Tồn kho và hạn sử dụng"]
    ].map(function (item) {
      return '<article class="stat-card"><span>' + item[0] + '</span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></article>';
    }).join("");
  }

  function renderActivities(data) {
    var target = qs("#activityList");
    if (!target) return;
    target.innerHTML = data.activities.map(function (item) {
      return '<article class="activity-item">' +
        '<span class="nav-icon">' + icon(item.status === "Cần xử lý" ? "alert" : "check") + '</span>' +
        '<div><h4>' + item.title + '</h4><p>' + item.description + '</p></div>' +
        '<span class="status ' + statusClass(item.status) + '">' + item.status + '</span>' +
        '</article>';
    }).join("");
  }

  function renderChart() {
    var target = qs("#salesChart");
    if (!target) return;
    var values = [54, 72, 61, 86, 74, 96, 88];
    var labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    target.innerHTML = values.map(function (value, index) {
      return '<div class="bar"><span style="height:' + value + '%"></span><small>' + labels[index] + '</small></div>';
    }).join("");
  }

  function productRow(product) {
    var stock = stockStatus(product);
    var expiry = expiryStatus(product);
    return '<tr data-stock-status="' + escapeHtml(stock) + '" data-text="' + escapeHtml([product.name, product.code, product.category, product.subcategory, product.childCategory, product.active, product.supplier].join(" ").toLowerCase()) + '">' +
      '<td><div class="table-product"><img src="' + asset(product.image) + '" alt="" loading="lazy"><div><strong>' + escapeHtml(product.name) + '</strong><span>' + escapeHtml(product.code + ' · ' + (product.active || product.subcategory || "")) + '</span></div></div></td>' +
      '<td>' + escapeHtml(product.category) + '</td>' +
      '<td>' + escapeHtml(product.supplier) + '</td>' +
      '<td>' + money(product.price) + '</td>' +
      '<td>' + number(product.stock) + '</td>' +
      '<td><span class="status ' + statusClass(stock) + '">' + stock + '</span></td>' +
      '<td><span class="status ' + statusClass(expiry) + '">' + expiry + '</span></td>' +
      '</tr>';
  }

  function renderProductTable(data) {
    var target = qs("#productTable");
    if (!target) return;
    var rows = data.products.map(productRow).join("");
    target.innerHTML = '<table class="data-table">' +
      '<thead><tr><th>Sản phẩm</th><th>Nhóm</th><th>Nhà cung cấp</th><th>Giá bán</th><th>Tồn</th><th>Tồn kho</th><th>Hạn dùng</th></tr></thead>' +
      '<tbody data-filter-body>' + rows + '</tbody></table>';
    bindCatalogFilters();
  }

  function renderInventory(data) {
    var target = qs("#inventoryTable");
    if (!target) return;
    var rows = data.products.map(function (product) {
      var stock = stockStatus(product);
      var expiry = expiryStatus(product);
      return '<tr>' +
        '<td><strong>' + escapeHtml(product.code) + '</strong></td>' +
        '<td>' + escapeHtml(product.name) + '</td>' +
        '<td>' + escapeHtml(product.category) + '</td>' +
        '<td>' + number(product.stock) + '</td>' +
        '<td>' + product.expiry.split("-").reverse().join("/") + '</td>' +
        '<td><span class="status ' + statusClass(stock) + '">' + stock + '</span></td>' +
        '<td><span class="status ' + statusClass(expiry) + '">' + expiry + '</span></td>' +
        '</tr>';
    }).join("");
    target.innerHTML = '<table class="data-table"><thead><tr><th>Mã</th><th>Sản phẩm</th><th>Nhóm</th><th>Tồn</th><th>Hạn dùng</th><th>Tình trạng</th><th>Cảnh báo</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderAlerts(data) {
    var target = qs("#alertList");
    if (!target) return;
    var alerts = data.products.filter(function (product) {
      return product.stock <= 15 || expiryStatus(product) !== "Còn hạn";
    });
    target.innerHTML = alerts.map(function (product) {
      var text = product.stock <= 0 ? "Hết hàng" : (product.stock <= 15 ? "Sắp hết hàng" : expiryStatus(product));
      return '<article class="alert-item">' +
        '<span class="nav-icon">' + icon("alert") + '</span>' +
        '<div><h4>' + escapeHtml(product.name) + '</h4><p>' + escapeHtml(product.code) + ' · Tồn ' + number(product.stock) + ' · Hạn ' + product.expiry.split("-").reverse().join("/") + '</p></div>' +
        '<span class="status ' + statusClass(text) + '">' + text + '</span>' +
        '</article>';
    }).join("") || emptyState("Chưa có cảnh báo tồn kho hoặc hạn dùng.");
  }

  function renderProductsGrid(data) {
    var target = qs("#productGrid");
    if (!target) return;
    var modal = qs("#productModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "productModal";
      modal.className = "product-modal";
      modal.setAttribute("aria-hidden", "true");
      document.body.appendChild(modal);
    }

    function productInfo(product) {
      return product.ingredients || product.active || product.specification || product.subcategory || "Chưa có thông tin chi tiết.";
    }

    function closeProductModal() {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = "";
    }

    function openProductModal(product) {
      modal.innerHTML =
        '<div class="product-modal-backdrop" data-product-modal-close></div>' +
        '<section class="product-modal-panel" role="dialog" aria-modal="true" aria-label="Chi tiết sản phẩm">' +
        '<button class="btn btn-light btn-icon product-modal-close" type="button" data-product-modal-close aria-label="Đóng">' + icon("minus") + '</button>' +
        '<div class="product-modal-media"><img src="' + asset(product.image) + '" alt="' + escapeHtml(product.name) + '"></div>' +
        '<div class="product-modal-content">' +
        '<span class="tag">' + escapeHtml(product.code + ' · ' + product.category) + '</span>' +
        '<h2>' + escapeHtml(product.name) + '</h2>' +
        '<p>' + escapeHtml(productInfo(product)) + '</p>' +
        '<div class="product-modal-actions">' +
        '<strong class="price">' + money(product.price) + '</strong>' +
        '<button class="btn btn-primary" type="button" data-add-cart="' + escapeHtml(product.code) + '">' + icon("plus") + '<span>Thêm</span></button>' +
        '</div>' +
        '</div>' +
        '</section>';
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    }

    var categoryFilter = qs("#posCategoryFilter");
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">Tất cả nhóm</option>' + unique(data.products.map(function (product) {
        return product.category;
      })).map(function (category) {
        return '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>';
      }).join("");
    }

    target.innerHTML = data.products.map(function (product) {
      return '<article class="product-card" data-product-card data-category="' + escapeHtml(product.category) + '" data-text="' + escapeHtml([product.name, product.code, product.category, product.subcategory, product.active].join(" ").toLowerCase()) + '">' +
        '<button class="product-image-button" type="button" data-product-detail="' + escapeHtml(product.code) + '" aria-label="Xem chi tiết ' + escapeHtml(product.name) + '">' +
        '<img src="' + asset(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
        '</button>' +
        '<h3>' + escapeHtml(product.name) + '</h3>' +
        '<p>' + escapeHtml(product.code + ' · ' + product.category) + '</p>' +
        '<footer><span class="price">' + money(product.price) + '</span><span class="tag">Chi tiết</span></footer>' +
        '</article>';
    }).join("");
    target.addEventListener("click", function (event) {
      var detailButton = event.target.closest("[data-product-detail]");
      if (!detailButton) return;
      var product = data.products.find(function (item) { return item.code === detailButton.dataset.productDetail; });
      if (product) openProductModal(product);
    });
    modal.addEventListener("click", function (event) {
      if (event.target.closest("[data-product-modal-close]") || event.target.closest("[data-add-cart]")) {
        closeProductModal();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.classList.contains("show")) closeProductModal();
    });
    bindProductFilter();
  }

  function initPos(data) {
    if (!qs("#cartList")) return;
    var cart = [];

    function renderCart() {
      var cartList = qs("#cartList");
      var subtotal = cart.reduce(function (sum, item) {
        return sum + item.product.price * item.qty;
      }, 0);
      var discountInput = qs("#discountInput");
      var discount = Math.min(Number(discountInput && discountInput.value || 0), subtotal);
      var total = Math.max(subtotal - discount, 0);

      if (!cart.length) {
        cartList.innerHTML = emptyState("Chưa có sản phẩm trong hóa đơn.");
      } else {
        cartList.innerHTML = cart.map(function (item) {
          return '<div class="cart-item">' +
            '<div><strong>' + item.product.name + '</strong><small>' + money(item.product.price) + ' · ' + item.product.code + '</small></div>' +
            '<div class="quantity-stepper" aria-label="Số lượng">' +
            '<button type="button" data-cart-dec="' + item.product.code + '">' + icon("minus") + '</button>' +
            '<span>' + item.qty + '</span>' +
            '<button type="button" data-cart-inc="' + item.product.code + '">' + icon("plus") + '</button>' +
            '</div>' +
            '</div>';
        }).join("");
      }

      qs("#subtotal").textContent = money(subtotal);
      qs("#discountValue").textContent = money(discount);
      qs("#grandTotal").textContent = money(total);
    }

    document.addEventListener("click", function (event) {
      var addButton = event.target.closest("[data-add-cart]");
      var incButton = event.target.closest("[data-cart-inc]");
      var decButton = event.target.closest("[data-cart-dec]");

      if (addButton) {
        var code = addButton.dataset.addCart;
        var product = data.products.find(function (item) { return item.code === code; });
        var exists = cart.find(function (item) { return item.product.code === code; });
        if (exists) exists.qty += 1;
        else cart.push({ product: product, qty: 1 });
        showToast("Đã thêm sản phẩm vào hóa đơn.");
        renderCart();
      }

      if (incButton) {
        cart.find(function (item) { return item.product.code === incButton.dataset.cartInc; }).qty += 1;
        renderCart();
      }

      if (decButton) {
        var found = cart.find(function (item) { return item.product.code === decButton.dataset.cartDec; });
        found.qty -= 1;
        cart = cart.filter(function (item) { return item.qty > 0; });
        renderCart();
      }
    });

    var discountInput = qs("#discountInput");
    if (discountInput) discountInput.addEventListener("input", renderCart);

    var checkout = qs("#checkoutButton");
    if (checkout) {
      checkout.addEventListener("click", function () {
        showToast(cart.length ? "Hóa đơn đã được xác nhận trên giao diện." : "Vui lòng thêm sản phẩm trước khi xác nhận.");
      });
    }

    renderCart();
  }

  function renderInvoices(data) {
    var target = qs("#invoiceTable");
    if (!target) return;
    target.innerHTML = '<table class="data-table"><thead><tr><th>Mã hóa đơn</th><th>Khách hàng</th><th>Nhân viên</th><th>Tổng tiền</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>' +
      data.invoices.map(function (invoice) {
        return '<tr><td><strong>' + invoice.id + '</strong></td><td>' + invoice.customer + '</td><td>' + invoice.staff + '</td><td>' + money(invoice.total) + '</td><td>' + invoice.createdAt + '</td><td><span class="status ' + statusClass(invoice.status) + '">' + invoice.status + '</span></td></tr>';
      }).join("") +
      '</tbody></table>';
    bindTableFilter("#invoiceSearch", "#invoiceTable tbody tr");
  }

  function renderFinance(data) {
    var target = qs("#financeTable");
    if (!target) return;
    target.innerHTML = '<table class="data-table"><thead><tr><th>Mã phiếu</th><th>Loại</th><th>Nội dung</th><th>Số tiền</th><th>Ngày tạo</th><th>Trạng thái</th></tr></thead><tbody>' +
      data.finance.map(function (item) {
        var status = item.type === "Thu" ? "Đã thu" : "Đã chi";
        return '<tr><td><strong>' + item.code + '</strong></td><td>' + item.type + '</td><td>' + item.content + '</td><td>' + money(item.amount) + '</td><td>' + item.createdAt.split("-").reverse().join("/") + '</td><td><span class="status ' + (item.type === "Thu" ? "status-ok" : "status-warn") + '">' + status + '</span></td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  function renderEmployees(data) {
    var target = qs("#employeeTable");
    if (!target) return;
    target.innerHTML = '<table class="data-table"><thead><tr><th>Mã</th><th>Họ tên</th><th>Vai trò</th><th>Số điện thoại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>' +
      data.employees.map(function (employee) {
        return '<tr><td><strong>' + employee.id + '</strong></td><td>' + employee.name + '</td><td>' + employee.role + '</td><td>' + employee.phone + '</td><td><span class="status ' + statusClass(employee.status) + '">' + employee.status + '</span></td><td><button class="btn btn-outline" type="button" data-toast="Màn hình chi tiết nhân viên sẽ được hoàn thiện ở giai đoạn sau.">Chi tiết</button></td></tr>';
      }).join("") +
      '</tbody></table>';
    bindTableFilter("#employeeSearch", "#employeeTable tbody tr");
  }

  function renderAdminUsers(data) {
    var target = qs("#userTable");
    if (!target) return;
    var fixedUsers = [
      { username: "quanly", role: "Quản lý", status: "Hoạt động" },
      { username: "banthuoc", role: "Dược sĩ bán thuốc", status: "Hoạt động" },
      { username: "admin", role: "Quản trị viên", status: "Hoạt động" }
    ];
    var registered = JSON.parse(localStorage.getItem("pharmacare_users") || "[]").map(function (item) {
      return { username: item.email, role: roles[item.role], status: "Tự đăng ký" };
    });
    var users = fixedUsers.concat(registered);
    target.innerHTML = '<table class="data-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Chính sách</th></tr></thead><tbody>' +
      users.map(function (user) {
        return '<tr><td><strong>' + user.username + '</strong></td><td>' + user.role + '</td><td><span class="status status-ok">' + user.status + '</span></td><td>Áp dụng phân quyền theo vai trò</td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  function renderReport(data) {
    var target = qs("#reportPanel");
    if (!target) return;
    var best = data.products.slice().sort(function (a, b) { return b.stock - a.stock; }).slice(0, 5);
    target.innerHTML =
      '<div class="two-col">' +
      '<div class="panel"><h3>Sản phẩm nổi bật</h3><div class="alert-list">' + best.map(function (product) {
        return '<article class="alert-item"><span class="nav-icon">' + icon("box") + '</span><div><h4>' + product.name + '</h4><p>' + product.category + ' · Tồn ' + number(product.stock) + '</p></div><span class="status status-ok">Theo dõi</span></article>';
      }).join("") + '</div></div>' +
      '<div class="panel"><h3>Dòng tiền</h3><div class="chart-bars" style="min-height:230px">' + [48, 68, 58, 82, 77, 91, 73].map(function (value, index) {
        return '<div class="bar"><span style="height:' + value + '%"></span><small>T' + (index + 1) + '</small></div>';
      }).join("") + '</div></div>' +
      '</div>';
  }

  function bindProductFilter() {
    var input = qs("#posSearch") || qs("#catalogSearch");
    var categoryFilter = qs("#posCategoryFilter");
    if (!input && !categoryFilter) return;

    function applyFilter() {
      var keyword = input ? input.value.trim().toLowerCase() : "";
      var category = categoryFilter ? categoryFilter.value : "";
      qsa("[data-product-card]").forEach(function (card) {
        var matchText = !keyword || card.dataset.text.indexOf(keyword) !== -1;
        var matchCategory = !category || card.dataset.category === category;
        card.style.display = matchText && matchCategory ? "" : "none";
      });
    }

    if (input) input.addEventListener("input", applyFilter);
    if (categoryFilter) categoryFilter.addEventListener("change", applyFilter);
    applyFilter();
  }

  function catalogFilterState() {
    var input = qs("#productSearch");
    var statusFilter = qs("#productStatusFilter");
    return {
      keyword: input ? input.value.trim().toLowerCase() : "",
      status: statusFilter ? statusFilter.value : ""
    };
  }

  function applyCatalogFilters() {
    var state = catalogFilterState();
    qsa("#productTable tbody tr, #landingProductGrid [data-product-card]").forEach(function (item) {
      var text = item.dataset.text || item.textContent.toLowerCase();
      var status = item.dataset.stockStatus || "";
      var matchText = !state.keyword || text.indexOf(state.keyword) !== -1;
      var matchStatus = !state.status || status === state.status;
      item.style.display = matchText && matchStatus ? "" : "none";
    });
  }

  function bindCatalogFilters() {
    var input = qs("#productSearch");
    var statusFilter = qs("#productStatusFilter");
    if (!input && !statusFilter) return;
    if (input && input.dataset.filterBound !== "true") {
      input.dataset.filterBound = "true";
      input.addEventListener("input", applyCatalogFilters);
    }
    if (statusFilter && statusFilter.dataset.filterBound !== "true") {
      statusFilter.dataset.filterBound = "true";
      statusFilter.addEventListener("change", applyCatalogFilters);
    }
    applyCatalogFilters();
  }

  function bindTableFilter(inputSelector, rowSelector) {
    var input = qs(inputSelector);
    if (!input) return;
    input.addEventListener("input", function () {
      var keyword = input.value.trim().toLowerCase();
      qsa(rowSelector).forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().indexOf(keyword) === -1 ? "none" : "";
      });
    });
  }

  function emptyState(text) {
    return '<div class="empty-state"><img src="' + asset("assets/img/empty-state.svg") + '" alt=""><strong>' + text + '</strong></div>';
  }

  function bindToastButtons() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-toast]");
      if (button) showToast(button.dataset.toast);
    });
  }

  function showToast(message) {
    var toast = qs("#toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  }

  function initHeroCarousel() {
    var carousel = qs("[data-hero-carousel]");
    if (!carousel) return;

    var track = qs("[data-hero-track]", carousel);
    var slides = qsa(".hero-slide", track);
    if (!track || slides.length < 2) return;

    var slideCount = slides.length;
    var index = 0;
    var timer = null;
    var dotsContainer = qs("[data-hero-dots]", carousel);
    var isDragging = false;
    var startX = 0;
    var dragX = 0;
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    track.appendChild(slides[0].cloneNode(true));

    if (dotsContainer) {
      dotsContainer.innerHTML = slides.map(function (_, dotIndex) {
        return '<button class="hero-dot" type="button" data-hero-dot="' + dotIndex + '" aria-label="Chuyển đến ảnh bìa ' + (dotIndex + 1) + '"></button>';
      }).join("");
    }

    function normalizeIndex(value) {
      return ((value % slideCount) + slideCount) % slideCount;
    }

    function currentDotIndex() {
      return normalizeIndex(index);
    }

    function updateDots() {
      if (!dotsContainer) return;
      qsa(".hero-dot", dotsContainer).forEach(function (dot, dotIndex) {
        dot.classList.toggle("is-active", dotIndex === currentDotIndex());
      });
    }

    function transformWithOffset(offset) {
      track.style.transform = "translateX(calc(-" + (index * 100) + "% + " + offset + "px))";
    }

    function setIndex(nextIndex, animate) {
      track.style.transition = animate ? "" : "none";
      index = nextIndex;
      transformWithOffset(0);
      updateDots();

      if (!animate) {
        window.requestAnimationFrame(function () {
          track.style.transition = "";
        });
      }
    }

    function nextSlide() {
      if (index >= slideCount) {
        setIndex(0, false);
        window.requestAnimationFrame(function () {
          setIndex(1, true);
        });
        return;
      }

      setIndex(index + 1, true);
    }

    function previousSlide() {
      if (index <= 0 || index > slideCount) {
        setIndex(slideCount, false);
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            setIndex(slideCount - 1, true);
          });
        });
        return;
      }

      setIndex(index - 1, true);
    }

    function restartTimer() {
      if (reducedMotion) return;
      window.clearInterval(timer);
      timer = window.setInterval(nextSlide, 3000);
    }

    track.addEventListener("transitionend", function () {
      if (index >= slideCount) {
        setIndex(0, false);
      }
      updateDots();
    });

    if (dotsContainer) {
      dotsContainer.addEventListener("click", function (event) {
        var dot = event.target.closest("[data-hero-dot]");
        if (!dot) return;
        setIndex(normalizeIndex(Number(dot.dataset.heroDot)), true);
        restartTimer();
      });
    }

    function startDrag(event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest("a, button, input, select, textarea")) return;
      isDragging = true;
      startX = event.clientX;
      dragX = 0;
      track.classList.add("is-dragging");
      track.style.transition = "none";
      window.clearInterval(timer);
      if (carousel.setPointerCapture) {
        carousel.setPointerCapture(event.pointerId);
      }
    }

    function moveDrag(event) {
      if (!isDragging) return;
      dragX = event.clientX - startX;
      transformWithOffset(dragX);
    }

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove("is-dragging");
      track.style.transition = "";

      var threshold = Math.min(120, carousel.clientWidth * 0.12);
      if (dragX <= -threshold) {
        nextSlide();
      } else if (dragX >= threshold) {
        previousSlide();
      } else {
        setIndex(normalizeIndex(index), true);
      }
      dragX = 0;
      restartTimer();
    }

    carousel.addEventListener("pointerdown", startDrag);
    carousel.addEventListener("pointermove", moveDrag);
    carousel.addEventListener("pointerup", endDrag);
    carousel.addEventListener("pointercancel", endDrag);

    carousel.addEventListener("mouseenter", function () {
      window.clearInterval(timer);
    });

    carousel.addEventListener("mouseleave", function () {
      if (!isDragging) restartTimer();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        setIndex(normalizeIndex(index), false);
        restartTimer();
      }
    });
    updateDots();
    restartTimer();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var session = requireAuth();
    initHeroCarousel();
    hydrateStaticIcons();
    renderSidebar(session);
    renderTopbar(session);
    bindShellActions();
    bindToastButtons();

    loadData().then(function (data) {
      renderLanding(data);
      renderProductBrowser(data);
      renderKpis(data);
      renderActivities(data);
      renderChart();
      renderProductTable(data);
      renderProductsGrid(data);
      initPos(data);
      renderInventory(data);
      renderAlerts(data);
      renderInvoices(data);
      renderFinance(data);
      renderEmployees(data);
      renderAdminUsers(data);
      renderReport(data);
    });
  });

  window.PharmaCare = {
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    dashboardFor: dashboardFor,
    roles: roles,
    showToast: showToast
  };
})();
