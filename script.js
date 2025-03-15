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
    Object.entries(data.nodes).forEach(([id, node]) => {
        if (id !== 'root') {
            const parentId = findParentId(id);
            if (parentId) {
                const parentNode = document.getElementById(parentId);
                const nextLevel = getOrCreateLevel(getNodeLevel(parentId) + 1);
                const newNode = createNode(id, node.title);
                nextLevel.appendChild(newNode);
            }
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
    }
    
    const content = document.createElement('div');
    content.className = 'node-content';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.ondblclick = () => showEditModal(id, title); // Редактирование по двойному клику
    titleEl.onclick = () => showTasksModal(id); // Показ задач по одиночному клику
    
    // Добавляем стили для заголовка, чтобы было понятно, что это кликабельный элемент
    titleEl.style.cursor = 'pointer';
    
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';
    addBtn.onclick = () => showAddNodeModal(id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => showDeleteConfirmation(id);
    
    const taskBtn = document.createElement('button');
    taskBtn.className = 'task-btn';
    taskBtn.textContent = '✓';
    taskBtn.onclick = () => showTasksModal(id);
    
    // Добавляем кнопки в контейнер
    buttons.appendChild(addBtn);
    buttons.appendChild(deleteBtn);
    buttons.appendChild(taskBtn);
    content.appendChild(titleEl);
    content.appendChild(buttons);
    node.appendChild(content);
    
    return node;
}

// Показать модальное окно для добавления узла
function showAddNodeModal(parentId) {
    const modal = document.getElementById('nodeModal');
    modal.style.display = 'block';
    modal.dataset.parentId = parentId;
    document.getElementById('nodeName').focus();
}

// Показать модальное окно с задачами
function showTasksModal(nodeId) {
    const modal = document.getElementById('tasksModal');
    modal.style.display = 'block';
    modal.dataset.nodeId = nodeId;
    
    const tasksList = document.getElementById('tasksList');
    const tasks = data.nodes[nodeId].tasks;
    
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-content">
                <label class="task-checkbox">
                    <input type="checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="toggleTask('${nodeId}', ${task.id})">
                    <span class="checkmark"></span>
                </label>
                <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            </div>
            <button class="delete-task-btn" onclick="deleteTask('${nodeId}', ${task.id})">🗑</button>
        </div>
    `).join('');
    
    document.getElementById('newTask').focus();
}

// Закрыть модальное окно
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Добавить новый узел
function addNode() {
    const modal = document.getElementById('nodeModal');
    const title = document.getElementById('nodeName').value.trim();
    const parentId = modal.dataset.parentId;
    
    if (title) {
        const newId = `node${data.nextId++}`;
        data.nodes[newId] = {
            title: title,
            tasks: [],
            parentId: parentId
        };
        
        const parentNode = document.getElementById(parentId);
        const nextLevel = getOrCreateLevel(getNodeLevel(parentId) + 1);
        const newNode = createNode(newId, title);
        nextLevel.appendChild(newNode);
        
        localStorage.setItem('treeData', JSON.stringify(data));
        closeModal('nodeModal');
        document.getElementById('nodeName').value = '';

        requestAnimationFrame(() => {
            setTimeout(updateAllLines, 50);
        });
    }
}

// Добавить задачу
function addTask() {
    const modal = document.getElementById('tasksModal');
    const nodeId = modal.dataset.nodeId;
    const taskText = document.getElementById('newTask').value.trim();
    
    if (taskText) {
        const task = {
            id: data.taskId++,
            text: taskText,
            completed: false
        };
        
        data.nodes[nodeId].tasks.push(task);
        document.getElementById('newTask').value = '';
        
        localStorage.setItem('treeData', JSON.stringify(data));
        showTasksModal(nodeId);
    }
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
    
    // Находим корневой узел и его прямых потомков
    const rootNode = document.querySelector('.root-node');
    const firstLevelNodes = document.querySelectorAll('[data-level="1"] .node');
    firstLevelNodes.forEach(node => {
        createConnectionLines(rootNode, node);
    });
    
    // Находим все остальные узлы, кроме корневого
    const otherNodes = document.querySelectorAll('.node:not(.root-node)');
    otherNodes.forEach(node => {
        const parentId = findParentId(node.id);
        const parentNode = document.getElementById(parentId);
        if (parentNode) {
            createConnectionLines(parentNode, node);
        }
    });
}

// Обновляем обработчик изменения размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateAllLines, 100);
});

// Обновляем стили для линий в CSS
const style = document.createElement('style');
style.textContent = `
    .connection-line {
        position: absolute;
        background-color: #8b4513;
        pointer-events: none;
        transform-origin: 0 0;
    }
`;
document.head.appendChild(style);

// Добавляем функции экспорта/импорта
function exportStructure() {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
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
        reader.onload = function(e) {
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

// Добавляем функцию показа модального окна подтверждения
function showClearConfirmation() {
    document.getElementById('clearModal').style.display = 'block';
}

// Добавляем функцию очистки всех данных
function clearAllData() {
    // Очищаем данные
    data.nodes = {
        'root': {
            title: 'Kodama',
            tasks: [],
            parentId: null
        }
    };
    data.nextId = 1;

    // Очищаем DOM
    document.querySelectorAll('.level').forEach(level => {
        if (level.dataset.level !== '1') {
            level.remove();
        } else {
            level.innerHTML = '';
        }
    });

    // Очищаем линии
    document.querySelectorAll('.connection-line').forEach(line => line.remove());

    // Очищаем localStorage
    localStorage.setItem('treeData', JSON.stringify(data));

    // Закрываем модальное окно
    closeModal('clearModal');
}

// Добавляем функции для редактирования и удаления
function showEditModal(id, currentTitle) {
    const modal = document.getElementById('editModal');
    const input = document.getElementById('editNodeName');
    input.value = currentTitle;
    modal.dataset.nodeId = id;
    modal.style.display = 'block';
    input.focus();
    input.select();
}

function editNode() {
    const modal = document.getElementById('editModal');
    const nodeId = modal.dataset.nodeId;
    const newTitle = document.getElementById('editNodeName').value.trim();
    
    if (newTitle) {
        data.nodes[nodeId].title = newTitle;
        document.querySelector(`#${nodeId} h3`).textContent = newTitle;
        
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
        closeModal('editModal');
    }
}

function showDeleteConfirmation(nodeId) {
    const modal = document.getElementById('deleteModal');
    modal.dataset.nodeId = nodeId;
    modal.style.display = 'block';
}

function deleteNode() {
    const modal = document.getElementById('deleteModal');
    const nodeId = modal.dataset.nodeId;
    
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

// Добавляем функцию переключения статуса задачи
function toggleTask(nodeId, taskId) {
    const task = data.nodes[nodeId].tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        const taskText = document.querySelector(`.task-item[data-task-id="${taskId}"] .task-text`);
        taskText.classList.toggle('completed');
        localStorage.setItem('treeData', JSON.stringify(data));
    }
}

// Добавляем функцию удаления задачи
function deleteTask(nodeId, taskId) {
    data.nodes[nodeId].tasks = data.nodes[nodeId].tasks.filter(t => t.id !== taskId);
    localStorage.setItem('treeData', JSON.stringify(data));
    showTasksModal(nodeId);
}
