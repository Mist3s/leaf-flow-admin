const API_BASE = 'https://app.zavarka39.ru/api';
const STORAGE_KEYS = {
  token: 'leaf-flow-admin-token',
};
const IMAGE_MAX_SIDE = 1200;
const IMAGE_QUALITY = 0.75;

const savedToken = localStorage.getItem(STORAGE_KEYS.token) || '';

const state = {
  token: savedToken,
  view: savedToken ? 'catalog' : 'auth',
  authStatus: null,
  createStatus: null,
  updateStatus: null,
  loadStatus: null,
  variantStatus: null,
  catalogStatus: null,
  catalogVariantStatus: {},
  newProductForm: createEmptyProductForm(),
  newProductVariants: [createEmptyVariant()],
  editProduct: null,
  categories: [],
  products: [],
  productsFilter: { category: '', search: '' },
  catalogPage: 1,
  catalogPageSize: 8,
  totalProducts: 0,
};

const root = document.getElementById('app-root');

function createEmptyVariant() {
  return { id: '', weight: '', price: '' };
}

function createEmptyProductForm() {
  return { id: '', name: '', description: '', category: '', tags: '' };
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setStatus(key, type, message) {
  state[key] = { type, message };
  render();
}

function setCatalogVariantStatus(productId, type, message) {
  state.catalogVariantStatus = {
    ...state.catalogVariantStatus,
    [productId]: { type, message },
  };
  render();
}

function resetStatuses() {
  state.authStatus = null;
  state.createStatus = null;
  state.updateStatus = null;
  state.loadStatus = null;
  state.variantStatus = null;
}

function renderStatus(status) {
  if (!status) return '';
  const map = { success: 'success', error: 'error', info: 'muted' };
  const cls = map[status.type] || 'muted';
  return `<div class="status ${cls}">${escapeHtml(status.message)}</div>`;
}

function renderAuthCard() {
  return `
    <section class="card stack">
      <div class="card-header">
        <h2>Авторизация</h2>
        <span class="helper">Bearer токен сохраняется локально</span>
      </div>
      <form id="token-form" class="list">
        <div>
          <label>Токен администратора</label>
          <input type="password" name="token" autocomplete="off" value="${escapeHtml(state.token)}" placeholder="Введите токен" />
        </div>
        <div class="actions">
          <button type="submit">Сохранить токен</button>
        </div>
      </form>
      ${renderStatus(state.authStatus)}
    </section>
  `;
}

function renderVariantRows(variants, editable, prefix) {
  return variants
    .map(
      (variant, idx) => `
      <div class="variant-row" data-${prefix}-variant-index="${idx}">
        <div>
          <label>ID упаковки</label>
          <input data-field="id" value="${escapeHtml(variant.id) || ''}" ${editable ? '' : 'readonly'} />
        </div>
        <div>
          <label>Вес / объем</label>
          <input data-field="weight" value="${escapeHtml(variant.weight) || ''}" ${editable ? '' : ''} />
        </div>
        <div>
          <label>Цена</label>
          <input data-field="price" value="${escapeHtml(variant.price) || ''}" ${editable ? '' : ''} />
        </div>
        ${editable
          ? `<div class="variant-actions">
              <button type="button" class="ghost" data-action="remove-variant" data-index="${idx}">Удалить</button>
            </div>`
          : ''}
      </div>`
    )
    .join('');
}

function renderCreateCard() {
  return `
    <section class="card stack">
      <div class="card-header">
        <h2>Добавление товара</h2>
        <span class="helper">Один запрос с упаковками и изображением</span>
      </div>
      <form id="create-form" class="list" autocomplete="off">
        <div class="grid-two">
          <div>
            <label>ID товара *</label>
            <input name="id" placeholder="unique-product-id" value="${escapeHtml(state.newProductForm.id)}" required />
          </div>
          <div>
            <label>Название *</label>
            <input name="name" placeholder="Матча классическая" value="${escapeHtml(state.newProductForm.name)}" required />
          </div>
        </div>
        <div>
          <label>Категория *</label>
          ${renderCategorySelect('create-category', state.newProductForm.category)}
        </div>
        <div>
          <label>Описание *</label>
          <textarea name="description" placeholder="Короткое описание продукта" required>${escapeHtml(
            state.newProductForm.description,
          )}</textarea>
        </div>
        <div>
          <label>Теги (через запятую)</label>
          <input name="tags" placeholder="matcha,organic,green" value="${escapeHtml(state.newProductForm.tags)}" />
        </div>
        <div>
          <label>Изображение (jpg/png)</label>
          <input name="image" type="file" accept="image/*" />
        </div>
        <div>
          <div class="section-title">Упаковки</div>
          <div class="variant-list" id="create-variant-list">
            ${renderVariantRows(state.newProductVariants, true, 'create')}
          </div>
          <button type="button" id="add-variant" class="ghost add-variant-btn">Добавить упаковку</button>
        </div>
        <button type="submit">Создать товар</button>
      </form>
      ${renderStatus(state.createStatus)}
    </section>
  `;
}

function renderLoadedProduct() {
  if (!state.editProduct) {
    return '<p class="helper">Загрузите товар по ID, чтобы редактировать.</p>';
  }

  const product = state.editProduct;
  const tags = product.tags?.join(', ');

  return `
    <form id="update-form" class="list">
        <div class="grid-two">
          <div>
            <label>Название</label>
            <input name="name" value="${escapeHtml(product.name) || ''}" />
          </div>
          <div>
            <label>Категория</label>
          ${renderCategorySelect('edit-category', product.category)}
          </div>
        </div>
      <div>
        <label>Описание</label>
        <textarea name="description">${escapeHtml(product.description) || ''}</textarea>
      </div>
      <div>
        <label>Теги (через запятую)</label>
        <input name="tags" value="${escapeHtml(tags) || ''}" />
      </div>
      <div>
        <label>Новое изображение (опционально)</label>
        <input name="image" type="file" accept="image/*" />
      </div>
      <button type="submit">Сохранить изменения</button>
    </form>
    <div class="section-title">Упаковки</div>
    <div class="variant-list" id="edit-variant-list">
      ${(state.editProduct.variants || [])
        .map(
          (variant, idx) => `
            <div class="variant-row" data-existing-variant-index="${idx}">
              <div>
                <label>ID</label>
                <input data-field="id" value="${escapeHtml(variant.id)}" readonly />
              </div>
              <div>
                <label>Вес / объем</label>
                <input data-field="weight" value="${escapeHtml(variant.weight)}" />
              </div>
              <div>
                <label>Цена</label>
                <input data-field="price" value="${escapeHtml(variant.price)}" />
              </div>
              <div class="variant-actions">
                <button type="button" class="ghost" data-action="update-variant" data-index="${idx}">Обновить</button>
                <button type="button" class="ghost danger" data-action="delete-variant" data-index="${idx}">Удалить</button>
              </div>
            </div>
          `
        )
        .join('') || '<p class="helper">У товара пока нет вариантов.</p>'}
    </div>
    <div class="section-title">Добавить упаковку</div>
    <form id="add-variant-form" class="variant-row">
      <div>
        <label>ID</label>
        <input name="id" placeholder="unique-variant-id" required />
      </div>
      <div>
        <label>Вес / объем</label>
        <input name="weight" placeholder="100g" required />
      </div>
      <div>
        <label>Цена</label>
        <input name="price" placeholder="590" required />
      </div>
      <button type="submit">Добавить</button>
    </form>
  `;
}

function renderEditCard() {
  return `
    <section class="card stack">
      <div class="card-header">
        <h2>Редактирование товара</h2>
        <span class="helper">Поиск по ID и частичные обновления</span>
      </div>
      <form id="load-form" class="list">
        <div>
          <label>ID товара</label>
          <input name="productId" placeholder="Введите id" value="${escapeHtml(state.editProduct?.id || '')}" required />
        </div>
        <button type="submit" class="ghost">Загрузить</button>
      </form>
      ${renderStatus(state.loadStatus)}
      ${renderLoadedProduct()}
      ${renderStatus(state.updateStatus)}
      ${renderStatus(state.variantStatus)}
    </section>
  `;
}

function renderCatalogCard() {
  return `
    <section class="card stack">
      <div class="card-header">
        <div>
          <h2>Каталог</h2>
          <span class="helper">Список товаров из публичного API</span>
        </div>
        <div class="header-actions">
          <button id="go-create">Добавить товар</button>
        </div>
      </div>
      <form id="catalog-filter" class="grid-two">
        <div>
          <label>Категория</label>
          ${renderCategorySelect('catalog-category', state.productsFilter.category, true)}
        </div>
        <div>
          <label>Поиск</label>
          <input name="search" placeholder="Название или тег" value="${escapeHtml(state.productsFilter.search)}" />
        </div>
        <button type="submit" class="ghost">Обновить список</button>
      </form>
      ${renderStatus(state.catalogStatus)}
      <div class="catalog-grid">
        ${state.products.length ? '' : '<p class="helper">Список пуст. Нажмите «Обновить список».</p>'}
        ${state.products
          .map(
            (product) => `
              <div class="catalog-card">
                ${renderCatalogImage(product)}
                <div class="catalog-header">
                  <div>
                    <div class="catalog-title">${escapeHtml(product.name)}</div>
                    <div class="catalog-meta">ID: ${escapeHtml(product.id)}</div>
                  </div>
                  <span class="badge">${escapeHtml(product.category)}</span>
                </div>
                <div class="chips">
                  ${(product.tags || [])
                    .map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`)
                    .join('') || '<span class="helper">Без тегов</span>'}
                </div>
                <div class="variant-list compact">
                  ${renderCatalogVariants(product)}
                </div>
                ${renderCatalogVariantStatus(product.id)}
                <div class="card-actions">
                  <button class="ghost" data-action="edit" data-id="${escapeHtml(product.id)}">Редактировать</button>
                </div>
              </div>
            `
          )
          .join('')}
      </div>
      ${renderPagination()}
    </section>
  `;
}

function renderCatalogImage(product) {
  const safeName = escapeHtml(product.name);
  if (product.image) {
    return `
      <div class="catalog-image">
        <img src="${escapeHtml(product.image)}" alt="${safeName}" loading="lazy" />
      </div>
    `;
  }
  return `
    <div class="catalog-image placeholder">
      <span>Нет изображения</span>
    </div>
  `;
}

function render() {
  if (!state.token && state.view !== 'auth') {
    state.view = 'auth';
  }

  root.innerHTML = `
    ${renderView()}
  `;

  if (state.view === 'auth') bindAuthCard();
  if (state.view === 'create') bindCreateCard();
  if (state.view === 'edit') bindEditCard();
  if (state.view === 'catalog') bindCatalog();
  bindBackToCatalog();

  prefetchCategories();
}

function renderView() {
  switch (state.view) {
    case 'create':
      return `${renderBackBar()}${renderCreateCard()}`;
    case 'edit':
      return `${renderBackBar()}${renderEditCard()}`;
    case 'catalog':
      return renderCatalogCard();
    case 'auth':
    default:
      return renderAuthCard();
  }
}

function renderBackBar() {
  return `
    <div class="back-bar">
      <button id="back-to-catalog" class="ghost">← Назад к каталогу</button>
    </div>
  `;
}

function bindBackToCatalog() {
  const back = document.getElementById('back-to-catalog');
  if (!back) return;
  back.addEventListener('click', async () => {
    state.view = 'catalog';
    render();
    await fetchProducts();
  });
}

function renderCategorySelect(id, current = '', allowBlank = false) {
  const placeholderText = allowBlank ? 'Все категории' : state.categories.length ? 'Выберите категорию' : 'Загрузка категорий...';
  const placeholder = `<option value="" ${current ? '' : 'selected'} ${allowBlank ? '' : 'disabled'}>${escapeHtml(placeholderText)}</option>`;

  const options = state.categories
    .map((category) => {
      const selected = category.id === current ? 'selected' : '';
      return `<option value="${escapeHtml(category.id)}" ${selected}>${escapeHtml(category.label)}</option>`;
    })
    .join('');

  return `
    <select name="category" id="${id}" ${allowBlank ? '' : 'required'}>
      ${placeholder}
      ${options}
    </select>
  `;
}

function renderCatalogVariants(product) {
  const variants = product.variants || [];
  const rows = variants
    .map(
      (variant) => `
        <div class="variant-row compact" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}">
          <div>
            <label>ID</label>
            <input data-field="id" value="${escapeHtml(variant.id)}" readonly />
          </div>
          <div>
            <label>Вес / объем</label>
            <input data-field="weight" value="${escapeHtml(variant.weight)}" />
          </div>
          <div>
            <label>Цена</label>
            <input data-field="price" value="${escapeHtml(variant.price)}" />
          </div>
          <div class="variant-actions">
            <button type="button" class="ghost" data-action="catalog-update-variant" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}">Обновить</button>
            <button type="button" class="ghost danger" data-action="catalog-delete-variant" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}">Удалить</button>
          </div>
        </div>
      `
    )
    .join('');

  const addRow = `
    <div class="variant-row compact add" data-product-id="${escapeHtml(product.id)}">
      <div>
        <label>Новая упаковка — ID</label>
        <input data-field="id" placeholder="unique-id" />
      </div>
      <div>
        <label>Вес / объем</label>
        <input data-field="weight" placeholder="100g" />
      </div>
      <div>
        <label>Цена</label>
        <input data-field="price" placeholder="590" />
      </div>
      <div class="variant-actions">
        <button type="button" data-action="catalog-add-variant" data-product-id="${escapeHtml(product.id)}">Добавить</button>
      </div>
    </div>
  `;

  const content = rows || '<span class="helper">Нет вариантов</span>';
  return content + addRow;
}

function renderCatalogVariantStatus(productId) {
  const status = state.catalogVariantStatus[productId];
  if (!status) return '';
  const cls = status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : 'muted';
  return `<div class="status ${cls}">${escapeHtml(status.message)}</div>`;
}

function renderPagination() {
  const totalItems = state.totalProducts || state.products.length;
  if (!totalItems) return '';
  const totalPages = getTotalPages();
  if (totalPages <= 1) return '';
  const start = (state.catalogPage - 1) * state.catalogPageSize + 1;
  const end = Math.min(state.catalogPage * state.catalogPageSize, totalItems);

  return `
    <div class="pagination">
      <div class="pagination-info">${start}–${end} из ${totalItems}</div>
      <div class="pagination-actions">
        <button type="button" class="ghost" data-action="prev-page" ${state.catalogPage === 1 ? 'disabled' : ''}>Назад</button>
        <span class="pagination-page">Стр. ${state.catalogPage} / ${totalPages}</span>
        <button type="button" class="ghost" data-action="next-page" ${state.catalogPage >= totalPages ? 'disabled' : ''}>Вперёд</button>
      </div>
    </div>
  `;
}

function bindAuthCard() {
  const form = document.getElementById('token-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = new FormData(form).get('token').trim();
    state.token = token;
    localStorage.setItem(STORAGE_KEYS.token, token);
    setStatus('authStatus', 'success', 'Токен сохранён локально.');
    state.view = 'catalog';
    render();
    fetchCategories();
    fetchProducts();
  });
}

function bindCreateCard() {
  if (!state.categories.length) {
    fetchCategories();
  }

  const createForm = document.getElementById('create-form');

  const syncDraft = (field, value) => {
    state.newProductForm = {
      ...state.newProductForm,
      [field]: value,
    };
  };

  const fieldListeners = [
    { name: 'id', type: 'input' },
    { name: 'name', type: 'input' },
    { name: 'description', type: 'input' },
    { name: 'tags', type: 'input' },
    { name: 'category', type: 'change' },
  ];

  fieldListeners.forEach(({ name, type }) => {
    const input = createForm.querySelector(`[name="${name}"]`);
    if (input) {
      input.addEventListener(type, (event) => {
        syncDraft(name, event.target.value);
      });
    }
  });

  const list = document.getElementById('create-variant-list');
  list.querySelectorAll('.variant-row input').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = Number(input.closest('.variant-row').dataset.createVariantIndex);
      const field = input.dataset.field;
      state.newProductVariants[idx][field] = input.value;
    });
  });

  list.querySelectorAll('[data-action="remove-variant"]').forEach((button) => {
    button.addEventListener('click', () => {
      const idx = Number(button.dataset.index);
      state.newProductVariants.splice(idx, 1);
      if (!state.newProductVariants.length) {
        state.newProductVariants.push(createEmptyVariant());
      }
      render();
    });
  });

  document.getElementById('add-variant').addEventListener('click', () => {
    state.newProductVariants.push(createEmptyVariant());
    render();
  });

  const form = document.getElementById('create-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.token) {
      setStatus('createStatus', 'error', 'Сначала сохраните токен администратора.');
      return;
    }

    const formData = new FormData(form);
    const id = formData.get('id').trim();
    const name = formData.get('name').trim();
    const description = formData.get('description').trim();
    const categorySelect = formData.get('category').trim();
    const tagString = formData.get('tags').trim();

    state.newProductForm = {
      id,
      name,
      description,
      category: categorySelect,
      tags: tagString,
    };

    if (!id || !name || !description || !categorySelect) {
      setStatus('createStatus', 'error', 'Заполните все обязательные поля товара.');
      return;
    }

    if (!tagString) {
      setStatus('createStatus', 'error', 'Укажите теги через запятую.');
      return;
    }

    const variants = state.newProductVariants
      .map((variant) => ({
        id: variant.id.trim(),
        weight: variant.weight.trim(),
        price: variant.price.trim(),
      }))
      .filter((variant) => variant.id || variant.weight || variant.price);

    const hasInvalidVariants = variants.some((variant) => !variant.id || !variant.weight || !variant.price);

    if (!variants.length || hasInvalidVariants) {
      setStatus('createStatus', 'error', 'Заполните все поля каждой упаковки и добавьте хотя бы одну.');
      return;
    }

    const payload = {
      id,
      name,
      description,
      category: categorySelect,
      tags: tagString
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      variants,
    };

    const file = formData.get('image');
    if (file && file.size) {
      payload.image_base64 = await encodeImage(file);
    }

    try {
      const response = await apiRequest('/v1/admin/products/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.newProductVariants = [createEmptyVariant()];
      state.newProductForm = createEmptyProductForm();
      form.reset();
      setStatus('createStatus', 'success', `Товар создан: ${response?.id || 'успешно'}`);
      state.catalogPage = 1;
      state.view = 'catalog';
      render();
      fetchProducts();
    } catch (error) {
      setStatus('createStatus', 'error', error.message);
    }
  });
}

function bindEditCard() {
  const loadForm = document.getElementById('load-form');
  loadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const productId = new FormData(loadForm).get('productId').trim();
    if (!productId) return;
    try {
      setStatus('loadStatus', 'info', 'Загрузка товара...');
      await fetchCategories();
      const product = await apiRequest(`/v1/catalog/products/${productId}`);
      state.editProduct = product;
      setStatus('loadStatus', 'success', 'Данные загружены');
    } catch (error) {
      state.editProduct = null;
      setStatus('loadStatus', 'error', error.message);
    }
    render();
  });

  const updateForm = document.getElementById('update-form');
  if (updateForm) {
    updateForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.token || !state.editProduct?.id) {
        setStatus('updateStatus', 'error', 'Токен или товар не найдены.');
        return;
      }

      const formData = new FormData(updateForm);
      const name = formData.get('name').trim();
      const description = formData.get('description').trim();
      const category = formData.get('category').trim();
      const tagString = formData.get('tags').trim();

      if (!name || !description || !category || !tagString) {
        setStatus('updateStatus', 'error', 'Заполните все поля товара перед сохранением.');
        return;
      }

      const tags = tagString
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const payload = {
        name,
        description,
        category,
        tags,
      };

      const file = formData.get('image');
      if (file && file.size) {
        payload.image_base64 = await encodeImage(file);
      }

      try {
        await apiRequest(`/v1/admin/products/${state.editProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setStatus('updateStatus', 'success', 'Товар обновлён');
        await reloadProduct(state.editProduct.id);
      } catch (error) {
        setStatus('updateStatus', 'error', error.message);
      }
    });
  }

  const variantList = document.getElementById('edit-variant-list');
  if (variantList) {
    variantList.querySelectorAll('[data-action="update-variant"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const idx = Number(button.dataset.index);
        const row = button.closest('.variant-row');
        const weight = row.querySelector('input[data-field="weight"]').value.trim();
        const price = row.querySelector('input[data-field="price"]').value.trim();
        const variant = state.editProduct.variants[idx];
        if (!weight || !price) {
          setStatus('variantStatus', 'error', 'Укажите вес и цену перед обновлением.');
          return;
        }
        try {
          await apiRequest(`/v1/admin/products/${state.editProduct.id}/variants/${variant.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ weight, price }),
          });
          setStatus('variantStatus', 'success', 'Упаковка обновлена');
          await reloadProduct(state.editProduct.id);
        } catch (error) {
          setStatus('variantStatus', 'error', error.message);
        }
      });
    });

    variantList.querySelectorAll('[data-action="delete-variant"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const idx = Number(button.dataset.index);
        const variant = state.editProduct.variants[idx];
        if (!confirm(`Удалить вариант ${variant.id}?`)) return;
        try {
          await apiRequest(`/v1/admin/products/${state.editProduct.id}/variants/${variant.id}`, {
            method: 'DELETE',
          });
          setStatus('variantStatus', 'success', 'Упаковка удалена');
          await reloadProduct(state.editProduct.id);
        } catch (error) {
          setStatus('variantStatus', 'error', error.message);
        }
      });
    });
  }

  const addVariantForm = document.getElementById('add-variant-form');
  if (addVariantForm) {
    addVariantForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(addVariantForm);
      const id = formData.get('id').trim();
      const weight = formData.get('weight').trim();
      const price = formData.get('price').trim();

      if (!id || !weight || !price) {
        setStatus('variantStatus', 'error', 'Заполните все поля новой упаковки.');
        return;
      }

      try {
        await apiRequest(`/v1/admin/products/${state.editProduct.id}/variants`, {
          method: 'POST',
          body: JSON.stringify({
            id,
            weight,
            price,
          }),
        });
        setStatus('variantStatus', 'success', 'Новая упаковка добавлена');
        addVariantForm.reset();
        await reloadProduct(state.editProduct.id);
      } catch (error) {
        setStatus('variantStatus', 'error', error.message);
      }
    });
  }
}

function bindCatalog() {
  if (!state.categories.length) {
    fetchCategories();
  }

  const filterForm = document.getElementById('catalog-filter');
  if (filterForm) {
    filterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(filterForm);
      state.productsFilter = {
        category: formData.get('category'),
        search: formData.get('search').trim(),
      };
      state.catalogPage = 1;
      await fetchProducts();
    });
  }

  if (!state.products.length) {
    fetchProducts();
  }

  document.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.dataset.id;
      await goToEdit(productId);
    });
  });

  const catalogGrid = document.querySelector('.catalog-grid');
  if (catalogGrid) {
    catalogGrid.addEventListener('click', async (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      const productId = event.target.dataset.productId;
      if (!productId) return;
      if (!state.token) {
        setCatalogVariantStatus(productId, 'error', 'Сначала сохраните токен администратора.');
        return;
      }

      if (action === 'catalog-update-variant') {
        const row = event.target.closest('.variant-row');
        const inputs = row.querySelectorAll('input');
        const payload = {};
        inputs.forEach((input) => {
          if (input.dataset.field !== 'id') {
            payload[input.dataset.field] = input.value.trim();
          }
        });
        setCatalogVariantStatus(productId, 'info', 'Обновляем упаковку...');
        try {
          await apiRequest(`/v1/admin/products/${productId}/variants/${event.target.dataset.variantId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          setCatalogVariantStatus(productId, 'success', 'Упаковка обновлена');
          await fetchProducts();
        } catch (error) {
          setCatalogVariantStatus(productId, 'error', error.message);
        }
      }

      if (action === 'catalog-delete-variant') {
        setCatalogVariantStatus(productId, 'info', 'Удаляем упаковку...');
        try {
          await apiRequest(`/v1/admin/products/${productId}/variants/${event.target.dataset.variantId}`, {
            method: 'DELETE',
          });
          setCatalogVariantStatus(productId, 'success', 'Упаковка удалена');
          await fetchProducts();
        } catch (error) {
          setCatalogVariantStatus(productId, 'error', error.message);
        }
      }

      if (action === 'catalog-add-variant') {
        const row = event.target.closest('.variant-row');
        const payload = {};
        row.querySelectorAll('input').forEach((input) => {
          payload[input.dataset.field] = input.value.trim();
        });
        if (!payload.id || !payload.weight || !payload.price) {
          setCatalogVariantStatus(productId, 'error', 'Заполните ID, вес и цену.');
          return;
        }
        setCatalogVariantStatus(productId, 'info', 'Добавляем упаковку...');
        try {
          await apiRequest(`/v1/admin/products/${productId}/variants`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          row.querySelectorAll('input').forEach((input) => (input.value = ''));
          setCatalogVariantStatus(productId, 'success', 'Упаковка добавлена');
          await fetchProducts();
        } catch (error) {
          setCatalogVariantStatus(productId, 'error', error.message);
        }
      }
    });
  }

  const pagination = document.querySelector('.pagination');
  if (pagination) {
    pagination.addEventListener('click', async (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      if (action === 'prev-page' && state.catalogPage > 1) {
        state.catalogPage -= 1;
        await fetchProducts();
      }
      if (action === 'next-page' && state.catalogPage < getTotalPages()) {
        state.catalogPage += 1;
        await fetchProducts();
      }
    });
  }

  const goCreate = document.getElementById('go-create');
  if (goCreate) {
    goCreate.addEventListener('click', () => {
      state.view = 'create';
      render();
    });
  }
}

async function goToEdit(productId) {
  try {
    setStatus('loadStatus', 'info', 'Загрузка товара...');
    const product = await apiRequest(`/v1/catalog/products/${productId}`);
    state.editProduct = product;
    state.view = 'edit';
    setStatus('loadStatus', 'success', 'Данные загружены');
  } catch (error) {
    setStatus('catalogStatus', 'error', error.message);
    render();
  }
}

function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  }).then(async (response) => {
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text;
    }
    if (!response.ok) {
      const message =
        response.status === 413
          ? 'Файл изображения слишком большой. Попробуйте выбрать картинку меньшего размера.'
          : data?.message || data?.detail?.[0]?.msg || response.statusText;
      throw new Error(message);
    }
    return data;
  });
}

async function reloadProduct(id) {
  try {
    const product = await apiRequest(`/v1/catalog/products/${id}`);
    state.editProduct = product;
    render();
  } catch (error) {
    setStatus('loadStatus', 'error', error.message);
  }
}

async function encodeImage(file) {
  const dataUrl = await readFileAsDataURL(file);
  const optimized = await resizeIfNeeded(dataUrl);
  return stripDataUrlPrefix(optimized);
}

function prefetchCategories() {
  if (!state.categories.length) {
    fetchCategories();
  }
}

let categoriesLoading = false;
async function fetchCategories() {
  if (categoriesLoading) return;
  categoriesLoading = true;
  try {
    const data = await apiRequest('/v1/catalog/categories');
    state.categories = data.items || [];
    render();
  } catch (error) {
    setStatus('catalogStatus', 'error', `Категории: ${error.message}`);
  } finally {
    categoriesLoading = false;
  }
}

let productsLoading = false;
async function fetchProducts() {
  if (productsLoading) return;
  productsLoading = true;
  try {
    setStatus('catalogStatus', 'info', 'Загружаем каталог...');
    const params = new URLSearchParams();
    if (state.productsFilter.category) params.set('category', state.productsFilter.category);
    if (state.productsFilter.search) params.set('search', state.productsFilter.search);
    params.set('limit', state.catalogPageSize);
    params.set('offset', (state.catalogPage - 1) * state.catalogPageSize);
    const data = await apiRequest(`/v1/catalog/products?${params.toString()}`);
    state.products = data.items || [];
    state.totalProducts = typeof data.total === 'number' ? data.total : state.products.length;
    const totalPages = getTotalPages();
    if (state.catalogPage > totalPages && totalPages > 0) {
      productsLoading = false;
      state.catalogPage = totalPages;
      await fetchProducts();
      return;
    }
    setStatus('catalogStatus', 'success', `Найдено ${state.totalProducts} товаров`);
  } catch (error) {
    setStatus('catalogStatus', 'error', error.message);
  } finally {
    productsLoading = false;
  }
}

function getTotalPages() {
  const totalItems = state.totalProducts || state.products.length;
  return Math.max(1, Math.ceil(totalItems / state.catalogPageSize));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripDataUrlPrefix(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function resizeIfNeeded(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const maxSide = Math.max(width, height);
      if (!maxSide || maxSide <= IMAGE_MAX_SIDE) {
        resolve(dataUrl);
        return;
      }

      const scale = IMAGE_MAX_SIDE / maxSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function bindGlobalActions() {
  document.getElementById('open-docs').addEventListener('click', () => {
    window.open('https://app.zavarka39.ru/api/docs', '_blank');
  });

  document.getElementById('clear-cache').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    state.token = '';
    state.editProduct = null;
    state.newProductVariants = [createEmptyVariant()];
    resetStatuses();
    render();
  });
}

render();
bindGlobalActions();
