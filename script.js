// Структура данных для хранения узлов и задач
const data = {
    nodes: {
        'root': {
            title: 'Kodama',
            tasks: [], // теперь каждая задача будет объектом { id: number, text: string, completed: boolean }
            parentId: null
        },
        'node1': {
            title: 'Узел 1',
            tasks: [],
            parentId: 'root'
        },
        'node2': {
            title: 'Узел 2',
            tasks: [],
            parentId: 'root'
        },
        'node3': {
            title: 'Узел 3',
            tasks: [],
            parentId: 'node1' // Дочерний узел для node1
        }
    },
    nextId: 4, // Убедитесь, что nextId соответствует количеству узлов
    taskId: 1 // добавляем счетчик для ID задач
};

// Загрузка данных из localStorage при старте
document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('treeData');
    if (savedData) {
        Object.assign(data, JSON.parse(savedData));
        restoreNodes();

        // Добавляем небольшую задержку для уверенности, что все узлы отрисованы
        setTimeout(() => {
            Object.entries(data.nodes).forEach(([id, node]) => {
                if (id !== 'root') {
                    const parentId = findParentId(id);
                    if (parentId) {
                        const parentNode = document.getElementById(parentId);
                        const childNode = document.getElementById(id);
                        if (parentNode && childNode) {
                            createConnectionLines(parentNode, childNode);
                        }
                    }
                }
            });
        }, 100);
    }
});

// Восстановление узлов из сохраненных данных
function restoreNodes() {
    // Сначала обрабатываем прямых потомков корня
    Object.entries(data.nodes).forEach(([id, node]) => {
        if (node.parentId === 'root') {
            const nextLevel = getOrCreateLevel(1);
            const newNode = createNode(id, node.title);
            nextLevel.appendChild(newNode);
        }
    });

    // Затем восстанавливаем все остальные узлы
    Object.entries(data.nodes).forEach(([id, node]) => {
        if (id !== 'root' && node.parentId !== 'root') {
            createNode(id, node.title);
        }
    });

    // Используем тот же подход для обновления линий
    requestAnimationFrame(() => {
        setTimeout(updateAllLines, 50);
    });
}

// Поиск родительского ID
function findParentId(nodeId) {
    return data.nodes[nodeId]?.parentId || null;
}

// Обновляем функцию создания узла
function createNode(id, title) {
    const node = document.createElement('div');
    node.className = 'node';
    node.id = id;

    // Добавляем имя родительского узла
    const parentId = findParentId(id);
    if (parentId) {
        const parentTitle = data.nodes[parentId].title;
        node.dataset.parentTitle = parentTitle;
        if (parentId !== 'root') {
            node.classList.add('children-node')
        }
    }

    const content = document.createElement('div');
    content.className = 'node-content';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.dataset.originalText = title; // Сохраняем оригинальный текст

    // Заменяем обработчик двойного клика на одинарный клик
    titleEl.addEventListener('click', (event) => {
        event.stopPropagation(); // Предотвращаем всплытие события

        // Проверяем, не редактируется ли уже заголовок
        if (titleEl.getAttribute('contenteditable') === 'true') {
            return;
        }

        // Делаем текст редактируемым
        titleEl.setAttribute('contenteditable', 'true');
        titleEl.classList.add('editing');
        titleEl.focus();

        // Устанавливаем выделение на всем тексте
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Обработчик клавиши Enter
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleEl.blur(); // Завершаем редактирование
            } else if (e.key === 'Escape') {
                e.preventDefault();
                titleEl.textContent = titleEl.dataset.originalText; // Восстанавливаем исходный текст
                titleEl.blur(); // Завершаем редактирование
            }
        };

        // Обработчик потери фокуса
        const handleBlur = () => {
            titleEl.removeAttribute('contenteditable');
            titleEl.classList.remove('editing');

            // Проверяем, изменился ли текст
            const newText = titleEl.textContent.trim();
            if (newText && newText !== titleEl.dataset.originalText) {
                editNode(id, newText);
                titleEl.dataset.originalText = newText;
            } else {
                titleEl.textContent = titleEl.dataset.originalText; // Восстанавливаем текст, если он пустой
            }

            // Удаляем обработчики
            titleEl.removeEventListener('keydown', handleKeyDown);
            titleEl.removeEventListener('blur', handleBlur);
        };

        // Добавляем обработчики
        titleEl.addEventListener('keydown', handleKeyDown);
        titleEl.addEventListener('blur', handleBlur);
    });

    // Элемент для отображения количества задач
    const taskCountEl = document.createElement('span');
    taskCountEl.className = 'task-count';
    taskCountEl.textContent = `Задач: ${data.nodes[id].tasks.length}`; // Изначально количество задач

    const buttons = document.createElement('div');
    buttons.className = 'buttons';

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';
    addBtn.onclick = () => showAddNodeModal(id);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => confirmDeleteNode(id);

    // Обновляем обработчик кнопки задач 
    const taskBtn = document.createElement('button');
    taskBtn.className = 'task-btn';
    taskBtn.textContent = '✓';
    taskBtn.onclick = (event) => {
        event.stopPropagation();
        showTasksModal(id);
    };

    // Добавляем кнопки в контейнер
    buttons.appendChild(taskCountEl)
    buttons.appendChild(addBtn);
    buttons.appendChild(deleteBtn);
    buttons.appendChild(taskBtn);

    content.appendChild(titleEl);
    content.appendChild(buttons);
    node.appendChild(content);

    // Если у узла есть родитель, добавляем его в родительский узел
    if (parentId) {
        const parentNode = document.getElementById(parentId);

        // Проверяем, есть ли контейнер для дочерних узлов
        let childrenContainer = parentNode.querySelector('.children-container');
        if (!childrenContainer) {
            // Создаем контейнер для дочерних узлов
            childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            parentNode.appendChild(childrenContainer);
        }

        // Добавляем дочерний узел в контейнер
        childrenContainer.appendChild(node);

        // Не добавляем узел в general level, если он уже добавлен в children-container
        return node;
    }

    updateTaskCount(id); // Инициализируем количество задач

    return node;
}

// Функция для показа модального окна добавления узла
function showAddNodeModal(parentId) {
    showModal({
        id: 'nodeModal',
        title: 'Добавить направление',
        fields: [
            {
                id: 'nodeName',
                type: 'text',
                placeholder: 'Название направления'
            }
        ],
        buttons: [
            {
                text: 'Добавить',
                action: (fields) => {
                    const nodeName = fields.nodeName.value.trim();
                    if (nodeName) {
                        addNode(parentId, nodeName);
                    }
                }
            },
            {
                text: 'Отмена',
                action: 'close'
            }
        ]
    });
}

// Функция добавления узла (обновленная)
function addNode(parentId, nodeName) {
    const newId = `node${data.nextId++}`;
    data.nodes[newId] = {
        title: nodeName,
        tasks: [],
        parentId: parentId
    };

    const parentNode = document.getElementById(parentId);
    const newNode = createNode(newId, nodeName);

    // Если родитель не корневой, то узел будет добавлен в его children-container в createNode
    if (parentId === 'root') {
        // Для корневого узла добавляем в общий уровень
        const nextLevel = getOrCreateLevel(getNodeLevel(parentId) + 1);
        nextLevel.appendChild(newNode);
    }

    localStorage.setItem('treeData', JSON.stringify(data));
    closeModal('nodeModal');

    requestAnimationFrame(() => {
        setTimeout(updateAllLines, 50);
    });
}

// Функция для показа модального окна с задачами
function showTasksModal(nodeId) {
    const node = getNodeById(nodeId);
    if (!node) return;

    const tasks = node.tasks || [];
    const sortedTasks = [...tasks].sort((a, b) => a.completed - b.completed);

    let tasksHtml = '';
    if (sortedTasks.length > 0) {
        tasksHtml = '<div class="tasks-list">';
        sortedTasks.forEach((task) => {
            tasksHtml += `
                        <div class="task-item">
                            <label class="task-checkbox">
                                <input type="checkbox" id="task_${task.id}" ${task.completed ? 'checked' : ''} 
                                       onchange="toggleTask('${nodeId}', ${task.id})">
                                <span class="checkmark"></span>
                            </label>
                            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                            <button class="delete-task-btn" onclick="deleteTask('${nodeId}', ${task.id})">✕</button>
                        </div>
                        `;
        });
        tasksHtml += '</div>';
    } else {
        tasksHtml = '<p class="no-tasks">Нет задач</p>';
    }

    showModal({
        id: 'tasksModal',
        title: `Задачи: ${node.title}`,
        content: tasksHtml,
        fields: [
            {
                id: 'newTask',
                type: 'text',
                placeholder: 'Новая задача'
            }
        ],
        buttons: [
            {
                text: 'Добавить задачу',
                action: (fields) => {
                    const taskText = fields.newTask.value.trim();
                    if (taskText) {
                        addTask(nodeId, taskText);
                        fields.newTask.value = ''; // Очистка поля
                        // Обновляем модальное окно с задачами
                        showTasksModal(nodeId);
                    }
                }
            },
            {
                text: 'Закрыть',
                action: 'close'
            }
        ]
    });
}

// Функция для подтверждения очистки всех данных
function confirmClearAll() {
    showModal({
        id: 'clearModal',
        title: 'Подтверждение очистки',
        content: 'Вы уверены, что хотите удалить все узлы и задачи?',
        buttons: [
            {
                text: 'Да, очистить',
                class: 'danger-btn',
                action: () => {
                    clearAllData();
                    closeModal('clearModal');
                }
            },
            {
                text: 'Отмена',
                action: 'close'
            }
        ]
    });
}

// Функция для показа модального окна редактирования узла
function showEditNodeModal(nodeId) {
    const node = getNodeById(nodeId); // Предполагаем, что эта функция уже существует

    showModal({
        id: 'editModal',
        title: 'Редактировать узел',
        fields: [
            {
                id: 'editNodeName',
                type: 'text',
                placeholder: 'Новое название',
                value: node.title
            }
        ],
        buttons: [
            {
                text: 'Сохранить',
                action: (fields) => {
                    const newName = fields.editNodeName.value.trim();
                    if (newName) {
                        editNode(nodeId, newName);
                        closeModal('editModal');
                    }
                }
            },
            {
                text: 'Отмена',
                action: 'close'
            }
        ]
    });
}

// Функция для подтверждения удаления узла
function confirmDeleteNode(nodeId) {
    showModal({
        id: 'deleteModal',
        title: 'Подтверждение удаления',
        content: 'Вы уверены, что хотите удалить этот узел и все его дочерние элементы?',
        buttons: [
            {
                text: 'Да, удалить',
                class: 'danger-btn',
                action: () => {
                    deleteNode(nodeId);
                    closeModal('deleteModal');
                }
            },
            {
                text: 'Отмена',
                action: 'close'
            }
        ]
    });
}

// Функция для создания и показа модального окна
function showModal(options) {
    // Параметры по умолчанию
    const defaults = {
        title: 'Модальное окно',
        content: '',
        fields: [],
        buttons: [
            {text: 'Закрыть', action: 'close', class: ''}
        ],
        onOpen: null,
        id: 'dynamicModal_' + Date.now()
    };

    // Объединение параметров по умолчанию с переданными параметрами
    const settings = {...defaults, ...options};

    // Удаляем предыдущее модальное окно с таким же ID, если оно существует
    const existingModal = document.getElementById(settings.id);
    if (existingModal) {
        existingModal.remove();
    }

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = settings.id;

    // Создаем содержимое модального окна
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Добавляем заголовок
    const title = document.createElement('h2');
    title.textContent = settings.title;
    modalContent.appendChild(title);

    // Добавляем основное содержимое, если оно есть
    if (settings.content) {
        const contentElement = document.createElement('p');
        contentElement.innerHTML = settings.content;
        modalContent.appendChild(contentElement);
    }

    // Добавляем поля ввода, если они указаны
    const inputFields = {};
    if (settings.fields && settings.fields.length > 0) {
        settings.fields.forEach(field => {
            if (field.type === 'text' || field.type === 'password' || field.type === 'number') {
                const input = document.createElement('input');
                input.type = field.type;
                input.placeholder = field.placeholder || '';
                input.value = field.value || '';
                input.id = field.id;

                if (field.label) {
                    const label = document.createElement('label');
                    label.textContent = field.label;
                    label.setAttribute('for', field.id);
                    modalContent.appendChild(label);
                }

                modalContent.appendChild(input);
                inputFields[field.id] = input;
            } else if (field.type === 'textarea') {
                const textarea = document.createElement('textarea');
                textarea.placeholder = field.placeholder || '';
                textarea.value = field.value || '';
                textarea.id = field.id;

                if (field.label) {
                    const label = document.createElement('label');
                    label.textContent = field.label;
                    label.setAttribute('for', field.id);
                    modalContent.appendChild(label);
                }

                modalContent.appendChild(textarea);
                inputFields[field.id] = textarea;
            } else if (field.type === 'custom') {
                const div = document.createElement('div');
                div.id = field.id;
                div.innerHTML = field.html || '';
                modalContent.appendChild(div);
                inputFields[field.id] = div;
            }
        });
    }

    // Добавляем кнопки
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'modal-buttons';

    settings.buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;

        if (button.class) {
            btn.className = button.class;
        }

        if (button.action === 'close') {
            btn.onclick = () => closeModal(settings.id);
        } else if (typeof button.action === 'function') {
            btn.onclick = () => {
                button.action(inputFields, settings.id);
            };
        }

        buttonsContainer.appendChild(btn);
    });

    modalContent.appendChild(buttonsContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Показываем модальное окно
    modal.style.display = 'flex';

    // Закрытие при клике вне модального окна
    const handleOutsideClick = (e) => {
        if (!modalContent.contains(e.target) && e.target !== modalContent) {
            closeModal(settings.id);
            document.removeEventListener('click', handleOutsideClick);
        }
    };

    // Добавляем обработчик с небольшой задержкой, чтобы не срабатывал сразу при открытии
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);

    // Вызываем callback после открытия, если он указан
    if (typeof settings.onOpen === 'function') {
        settings.onOpen(inputFields, settings.id);
    }

    // Возвращаем объект с методами (добавляем removeListener для очистки)
    return {
        modal: modal,
        fields: inputFields,
        close: () => {
            document.removeEventListener('click', handleOutsideClick);
            closeModal(settings.id);
        }
    };
}

// Функция для закрытия модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Необязательно удалять модальное окно, но можно и так:
        // modal.remove();
    }
}

// Добавить задачу
function addTask(nodeId, taskText) {
    const task = {
        id: data.taskId++,
        text: taskText,
        completed: false
    };

    data.nodes[nodeId].tasks.unshift(task);

    // Обновляем количество задач
    updateTaskCount(nodeId);

    localStorage.setItem('treeData', JSON.stringify(data));
    showTasksModal(nodeId);
}

// Получить уровень узла
function getNodeLevel(nodeId) {
    if (nodeId === 'root') return 0;
    return parseInt(document.getElementById(nodeId).closest('.level').dataset.level);
}

// Получить или создать уровень
function getOrCreateLevel(level) {
    let levelEl = document.querySelector(`[data-level="${level}"]`);
    if (!levelEl) {
        levelEl = document.createElement('div');
        levelEl.className = 'level';
        levelEl.dataset.level = level;
        document.querySelector('.tree-container').appendChild(levelEl);
    }
    return levelEl;
}

// Обновляем функцию создания линий для поддержки анимации
function createConnectionLines(parentNode, childNode) {
    // Получаем точные координаты центров верха и низа элементов
    const parentRect = parentNode.getBoundingClientRect();
    const childRect = childNode.getBoundingClientRect();
    const containerRect = document.querySelector('.tree-container').getBoundingClientRect();

    // Вычисляем точки соединения
    const parentBottom = {
        x: parentRect.left + (parentRect.width / 2) - containerRect.left,
        y: parentRect.bottom - containerRect.top
    };

    const childTop = {
        x: childRect.left + (childRect.width / 2) - containerRect.left,
        y: childRect.top - containerRect.top
    };

    // Создаем линию
    const line = document.createElement('div');
    line.className = 'connection-line';

    // Вычисляем длину линии с помощью теоремы Пифагора
    const length = Math.sqrt(
        Math.pow(childTop.x - parentBottom.x, 2) +
        Math.pow(childTop.y - parentBottom.y, 2)
    );

    // Вычисляем угол наклона линии
    const angle = Math.atan2(
        childTop.y - parentBottom.y,
        childTop.x - parentBottom.x
    );

    // Обновляем установку стилей для линии
    line.style.setProperty('--angle', `${angle}rad`);
    line.style.height = '2px';
    line.style.width = `${length}px`;
    line.style.left = `${parentBottom.x}px`;
    line.style.top = `${parentBottom.y}px`;

    document.querySelector('.tree-container').appendChild(line);
}

// Обновляем функцию обновления всех линий
function updateAllLines() {
    // Очищаем старые линии
    document.querySelectorAll('.connection-line').forEach(line => line.remove());

    // Проходим по всем узлам и создаем линии соединения с их родителями
    Object.entries(data.nodes).forEach(([id, node]) => {
        if (id !== 'root' && node.parentId) {
            const parentNode = document.getElementById(node.parentId);
            const childNode = document.getElementById(id);

            if (parentNode && childNode) {
                createConnectionLines(parentNode, childNode);
            }
        }
    });
}

// Обновляем обработчик изменения размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateAllLines, 100);
});

// Добавляем функции экспорта/импорта
function exportStructure() {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kodama-structure.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importStructure(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);

                // Очищаем существующие данные и узлы
                data.nodes = {
                    'root': {
                        title: 'Kodama',
                        tasks: [],
                        parentId: null
                    }
                };

                // Очищаем DOM
                document.querySelectorAll('.level').forEach(level => {
                    if (level.dataset.level !== '1') {
                        level.remove();
                    } else {
                        level.innerHTML = '';
                    }
                });

                // Сначала импортируем все узлы
                Object.entries(importedData.nodes).forEach(([id, node]) => {
                    if (id !== 'root') {
                        data.nodes[id] = {
                            ...node,
                            parentId: node.parentId || 'root' // Если parentId не указан, считаем корневым
                        };
                    }
                });

                // Устанавливаем правильный nextId
                data.nextId = Math.max(
                    ...Object.keys(data.nodes)
                        .filter(id => id !== 'root')
                        .map(id => parseInt(id.replace('node', '')))
                ) + 1;

                // Строим дерево уровень за уровнем
                function buildLevel(parentId, level) {
                    const levelEl = getOrCreateLevel(level);

                    // Находим все узлы текущего уровня
                    Object.entries(data.nodes).forEach(([id, node]) => {
                        if (node.parentId === parentId) {
                            const newNode = createNode(id, node.title);
                            levelEl.appendChild(newNode);
                        }
                    });
                }

                // Начинаем с корневого уровня
                buildLevel('root', 1);

                // Сохраняем в localStorage
                localStorage.setItem('treeData', JSON.stringify(data));

                // Обновляем линии
                requestAnimationFrame(() => {
                    setTimeout(updateAllLines, 50);
                });
            } catch (error) {
                console.error('Ошибка при импорте:', error);
                alert('Ошибка при импорте файла');
            }
        };
        reader.readAsText(file);
    }
    event.target.value = '';
}

// Обновляем функцию редактирования узла
function editNode(nodeId, newTitle) {
    data.nodes[nodeId].title = newTitle;

    // Обновляем отображение имени родителя у дочерних узлов
    Object.entries(data.nodes).forEach(([id, node]) => {
        if (node.parentId === nodeId) {
            const childNode = document.getElementById(id);
            if (childNode) {
                childNode.dataset.parentTitle = newTitle;
            }
        }
    });

    localStorage.setItem('treeData', JSON.stringify(data));
}

function deleteNode(nodeId) {
    // Рекурсивно находим и удаляем все дочерние узлы
    function deleteChildren(parentId) {
        Object.entries(data.nodes).forEach(([id, node]) => {
            if (node.parentId === parentId) {
                deleteChildren(id);
                delete data.nodes[id];
                const nodeEl = document.getElementById(id);
                if (nodeEl) nodeEl.remove();
            }
        });
    }

    // Удаляем узел и его детей
    deleteChildren(nodeId);
    delete data.nodes[nodeId];
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl) nodeEl.remove();

    // Обновляем линии и сохраняем данные
    updateAllLines();
    localStorage.setItem('treeData', JSON.stringify(data));
    closeModal('deleteModal');
}

// Обновляем функцию переключения статуса задачи
function toggleTask(nodeId, taskId) {
    const node = getNodeById(nodeId);
    if (!node) return;

    const task = node.tasks.find(t => t.id === Number(taskId));
    if (task) {
        task.completed = !task.completed;

        // Обновляем визуальное отображение
        const taskText = document.querySelector(`#tasksModal .task-item input[id="task_${taskId}"]`)
            .closest('.task-item').querySelector('.task-text');

        if (taskText) {
            if (task.completed) {
                taskText.classList.add('completed');
            } else {
                taskText.classList.remove('completed');
            }
        }

        updateTaskCount(nodeId);
        localStorage.setItem('treeData', JSON.stringify(data));
    }
}

// Обновляем функцию удаления задачи
function deleteTask(nodeId, taskId) {
    const node = getNodeById(nodeId);
    if (!node) return;

    node.tasks = node.tasks.filter(t => t.id !== taskId);

    // Обновляем количество задач
    updateTaskCount(nodeId);

    localStorage.setItem('treeData', JSON.stringify(data));
    showTasksModal(nodeId);
}

function updateTaskCount(nodeId) {
    const taskCountEl = document.querySelector(`#${nodeId} .task-count`);
    const tasks = data.nodes[nodeId].tasks;

    // Считаем количество невыполненных задач
    const incompleteTasksCount = tasks.filter(task => !task.completed).length;

    // Обновляем текст элемента
    taskCountEl.textContent = `Задач: ${incompleteTasksCount}`;

    // Показываем или скрываем элемент в зависимости от количества задач
    if (incompleteTasksCount > 0) {
        taskCountEl.style.display = 'inline'; // Показываем элемент
    } else {
        taskCountEl.style.display = 'none'; // Скрываем элемент
    }
}

// Добавляем функцию для получения данных узла по ID
function getNodeById(nodeId) {
    return data.nodes[nodeId] || null;
}

// Функция для очистки всех данных
function clearAllData() {
    // Сбрасываем структуру данных
    data.nodes = {
        'root': {
            title: 'Kodama',
            tasks: [],
            parentId: null
        }
    };
    data.nextId = 1;
    data.taskId = 1;

    // Очищаем DOM от всех узлов, кроме корневого
    document.querySelectorAll('.node:not(#root)').forEach(node => node.remove());

    // Очищаем все уровни, кроме первого
    document.querySelectorAll('.level:not([data-level="1"])').forEach(level => level.remove());

    // Очищаем первый уровень
    const firstLevel = document.querySelector('.level[data-level="1"]');
    if (firstLevel) {
        firstLevel.innerHTML = '';
    }

    // Удаляем все линии соединений
    document.querySelectorAll('.connection-line').forEach(line => line.remove());

    // Обновляем заголовок корневого узла (на всякий случай)
    const rootTitle = document.querySelector('#root h2');
    if (rootTitle) {
        rootTitle.textContent = 'Kodama';
    }

    // Сохраняем пустую структуру в localStorage
    localStorage.setItem('treeData', JSON.stringify(data));
}

// Обновляем функцию для генерации тестовых узлов
function generateTestNodes() {
    // Создаем тестовые узлы
    const testStructure = [
        {
            title: "Образование",
            tasks: ["Разработать новые курсы", "Нанять преподавателей", "Обновить учебные материалы"],
            children: [
                {
                    title: "Онлайн-курсы",
                    tasks: ["Записать видеоуроки", "Создать тесты"],
                    children: []
                },
                {
                    title: "Очные классы",
                    tasks: ["Подготовить помещения", "Составить расписание", "Заказать оборудование"],
                    children: []
                }
            ]
        },
        {
            title: "Маркетинг",
            tasks: ["Разработать стратегию", "Запустить рекламу", "Собрать аналитику"],
            children: [
                {
                    title: "Социальные сети",
                    tasks: ["Запустить кампанию в Instagram", "Создать контент-план"],
                    children: []
                }
            ]
        },
        {
            title: "Финансы",
            tasks: ["Составить бюджет", "Найти инвесторов"],
            children: []
        }
    ];

    // Очищаем перед созданием, чтобы избежать дублирования
    clearAllData();

    // Рекурсивная функция для создания узлов и задач
    function createTestNode(parentId, nodeData) {
        const newId = `node${data.nextId++}`;
        data.nodes[newId] = {
            title: nodeData.title,
            tasks: [],
            parentId: parentId
        };

        // Добавляем задачи к узлу
        if (nodeData.tasks && nodeData.tasks.length > 0) {
            nodeData.tasks.forEach(taskText => {
                const task = {
                    id: data.taskId++,
                    text: taskText,
                    completed: Math.random() > 0.7 // Случайно отмечаем задачу как выполненную
                };
                data.nodes[newId].tasks.push(task);
            });
        }

        // Добавляем узел в DOM
        const newNode = createNode(newId, nodeData.title);

        // Если родитель корневой, добавляем в уровень
        if (parentId === 'root') {
            const level = getOrCreateLevel(1);
            level.appendChild(newNode);
        }

        // Рекурсивно создаем дочерние узлы
        if (nodeData.children && nodeData.children.length > 0) {
            nodeData.children.forEach(childData => {
                createTestNode(newId, childData);
            });
        }

        return newId;
    }

    // Создаем тестовые узлы
    testStructure.forEach(nodeData => {
        createTestNode('root', nodeData);
    });

    // Сохраняем данные и обновляем линии
    localStorage.setItem('treeData', JSON.stringify(data));

    requestAnimationFrame(() => {
        setTimeout(updateAllLines, 50);
    });
}