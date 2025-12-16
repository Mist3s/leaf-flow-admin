const API_BASE = 'https://app.zavarka39.ru/api';
const STORAGE_KEYS = {
  token: 'leaf-flow-admin-token',
};

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  profile: null,
  authStatus: null,
  createStatus: null,
  updateStatus: null,
  loadStatus: null,
  variantStatus: null,
  newProductVariants: [createEmptyVariant()],
  editProduct: null,
};

const root = document.getElementById('app-root');

function createEmptyVariant() {
  return { id: '', weight: '', price: '' };
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
  const profile = state.profile
    ? `<div class="list">
        <div class="badge">Пользователь: <strong>${escapeHtml(state.profile.firstName)}</strong></div>
        <div class="badge">Telegram ID: ${escapeHtml(state.profile.telegramId)}</div>
      </div>`
    : '<p class="helper">Введите токен и нажмите «Проверить доступ»</p>';

  return `
    <section class="card">
      <div class="card-header">
        <h2>Авторизация</h2>
        <span class="helper">Bearer токен</span>
      </div>
      <form id="token-form" class="list">
        <div>
          <label>Токен администратора</label>
          <input type="password" name="token" autocomplete="off" value="${escapeHtml(state.token)}" placeholder="Введите токен" />
        </div>
        <div class="actions">
          <button type="submit">Сохранить токен</button>
          <button type="button" class="ghost" id="check-profile">Проверить доступ</button>
        </div>
      </form>
      ${renderStatus(state.authStatus)}
      <div class="section-title">Текущий пользователь</div>
      ${profile}
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
    <section class="card">
      <div class="card-header">
        <h2>Добавление товара</h2>
        <span class="helper">Один запрос с упаковками и изображением</span>
      </div>
      <form id="create-form" class="list" autocomplete="off">
        <div class="grid-two">
          <div>
            <label>Название *</label>
            <input name="name" placeholder="Матча классическая" required />
          </div>
          <div>
            <label>Категория *</label>
            <input name="category" placeholder="tea" required />
          </div>
        </div>
        <div>
          <label>Описание *</label>
          <textarea name="description" placeholder="Короткое описание продукта" required></textarea>
        </div>
        <div>
          <label>Теги (через запятую)</label>
          <input name="tags" placeholder="matcha,organic,green" />
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
          <button type="button" id="add-variant" class="ghost">Добавить упаковку</button>
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
          <input name="category" value="${escapeHtml(product.category) || ''}" />
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
    <section class="card">
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

function render() {
  root.innerHTML = [renderAuthCard(), renderCreateCard(), renderEditCard()].join('');
  bindAuthCard();
  bindCreateCard();
  bindEditCard();
}

function bindAuthCard() {
  const form = document.getElementById('token-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = new FormData(form).get('token').trim();
    state.token = token;
    localStorage.setItem(STORAGE_KEYS.token, token);
    setStatus('authStatus', 'success', 'Токен сохранён локально.');
    if (token) {
      fetchProfile();
    }
  });

  document.getElementById('check-profile').addEventListener('click', (event) => {
    event.preventDefault();
    fetchProfile();
  });
}

function bindCreateCard() {
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
    const payload = {
      name: formData.get('name').trim(),
      description: formData.get('description').trim(),
      category: formData.get('category').trim(),
      tags: formData
        .get('tags')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      variants: state.newProductVariants
        .map((variant) => ({
          id: variant.id.trim(),
          weight: variant.weight.trim(),
          price: variant.price.trim(),
        }))
        .filter((variant) => variant.id && variant.weight && variant.price),
    };

    const file = formData.get('image');
    if (file && file.size) {
      payload.image_base64 = await fileToBase64(file);
    }

    try {
      const response = await apiRequest('/v1/admin/products/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.newProductVariants = [createEmptyVariant()];
      form.reset();
      setStatus('createStatus', 'success', `Товар создан: ${response?.id || 'успешно'}`);
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
      const tagString = formData.get('tags').trim();
      const tags = tagString
        ? tagString
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : null;
      const payload = {
        name: formData.get('name').trim() || null,
        description: formData.get('description').trim() || null,
        category: formData.get('category').trim() || null,
        tags,
      };

      const file = formData.get('image');
      if (file && file.size) {
        payload.image_base64 = await fileToBase64(file);
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
        try {
          await apiRequest(`/v1/admin/products/${state.editProduct.id}/variants/${variant.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ weight: weight || null, price: price || null }),
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
      try {
        await apiRequest(`/v1/admin/products/${state.editProduct.id}/variants`, {
          method: 'POST',
          body: JSON.stringify({
            id: formData.get('id').trim(),
            weight: formData.get('weight').trim(),
            price: formData.get('price').trim(),
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
      const message = data?.message || data?.detail?.[0]?.msg || response.statusText;
      throw new Error(message);
    }
    return data;
  });
}

async function fetchProfile() {
  if (!state.token) {
    setStatus('authStatus', 'error', 'Введите токен для проверки.');
    return;
  }
  try {
    setStatus('authStatus', 'info', 'Проверяем токен...');
    const profile = await apiRequest('/v1/auth/profile');
    state.profile = profile;
    setStatus('authStatus', 'success', 'Доступ подтверждён');
  } catch (error) {
    state.profile = null;
    setStatus('authStatus', 'error', error.message);
  }
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindGlobalActions() {
  document.getElementById('open-docs').addEventListener('click', () => {
    window.open('https://app.zavarka39.ru/api/docs', '_blank');
  });

  document.getElementById('clear-cache').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    state.token = '';
    state.profile = null;
    state.editProduct = null;
    state.newProductVariants = [createEmptyVariant()];
    resetStatuses();
    render();
  });
}

render();
bindGlobalActions();

if (state.token) {
  fetchProfile();
}
