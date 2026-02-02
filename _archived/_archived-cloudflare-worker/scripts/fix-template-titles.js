/**
 * 템플릿 제목 수정 - 키워드 매칭을 위해 한글 키워드 추가
 */

import axios from 'axios';

const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

const FIXED_TEMPLATES = [
  {
    title: 'ToDo 앱 투두 할일 목록 만들기',
    url: 'https://flutter-chatbot.dev/templates/todo',
    content: `ToDo 앱, 투두리스트, 할 일 목록 앱을 만드는 방법입니다.

\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ToDo App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const TodoScreen(),
    );
  }
}

class Todo {
  String title;
  bool isDone;

  Todo({required this.title, this.isDone = false});
}

class TodoScreen extends StatefulWidget {
  const TodoScreen({super.key});

  @override
  State<TodoScreen> createState() => _TodoScreenState();
}

class _TodoScreenState extends State<TodoScreen> {
  final List<Todo> _todos = [];
  final TextEditingController _controller = TextEditingController();

  void _addTodo() {
    if (_controller.text.isEmpty) return;
    setState(() {
      _todos.add(Todo(title: _controller.text));
      _controller.clear();
    });
  }

  void _toggleTodo(int index) {
    setState(() {
      _todos[index].isDone = !_todos[index].isDone;
    });
  }

  void _deleteTodo(int index) {
    setState(() {
      _todos.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('할 일 목록')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: '할 일을 입력하세요',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _addTodo(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _addTodo,
                  child: const Text('추가'),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _todos.length,
              itemBuilder: (context, index) {
                final todo = _todos[index];
                return ListTile(
                  leading: Checkbox(
                    value: todo.isDone,
                    onChanged: (_) => _toggleTodo(index),
                  ),
                  title: Text(
                    todo.title,
                    style: TextStyle(
                      decoration: todo.isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete),
                    onPressed: () => _deleteTodo(index),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
\`\`\`

할 일 추가, 완료 체크, 삭제 기능이 포함된 기본 ToDo 앱입니다.`,
  },
  {
    title: '계산기 앱 Calculator 만들기',
    url: 'https://flutter-chatbot.dev/templates/calculator',
    content: `계산기 앱, Calculator 앱을 만드는 방법입니다. 사칙연산을 지원합니다.

\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Calculator',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const CalculatorScreen(),
    );
  }
}

class CalculatorScreen extends StatefulWidget {
  const CalculatorScreen({super.key});

  @override
  State<CalculatorScreen> createState() => _CalculatorScreenState();
}

class _CalculatorScreenState extends State<CalculatorScreen> {
  String _display = '0';
  double _firstNum = 0;
  String _operator = '';
  bool _shouldReset = false;

  void _onNumber(String num) {
    setState(() {
      if (_display == '0' || _shouldReset) {
        _display = num;
        _shouldReset = false;
      } else {
        _display += num;
      }
    });
  }

  void _onOperator(String op) {
    _firstNum = double.parse(_display);
    _operator = op;
    _shouldReset = true;
  }

  void _onEquals() {
    double second = double.parse(_display);
    double result = 0;
    switch (_operator) {
      case '+':
        result = _firstNum + second;
        break;
      case '-':
        result = _firstNum - second;
        break;
      case '*':
        result = _firstNum * second;
        break;
      case '/':
        result = second != 0 ? _firstNum / second : 0;
        break;
    }
    setState(() {
      _display = result.toString();
      if (_display.endsWith('.0')) {
        _display = _display.substring(0, _display.length - 2);
      }
    });
  }

  void _onClear() {
    setState(() {
      _display = '0';
      _firstNum = 0;
      _operator = '';
    });
  }

  Widget _buildButton(String text, {VoidCallback? onTap, Color? color}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: color ?? Colors.grey[300],
            padding: const EdgeInsets.all(20),
          ),
          onPressed: onTap,
          child: Text(text, style: const TextStyle(fontSize: 24, color: Colors.black)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('계산기')),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: Container(
              alignment: Alignment.bottomRight,
              padding: const EdgeInsets.all(24),
              child: Text(_display, style: const TextStyle(fontSize: 48)),
            ),
          ),
          Expanded(
            flex: 4,
            child: Column(
              children: [
                Row(children: [
                  _buildButton('C', color: Colors.red[200], onTap: _onClear),
                  _buildButton('/', color: Colors.orange, onTap: () => _onOperator('/')),
                ]),
                Row(children: [
                  _buildButton('7', onTap: () => _onNumber('7')),
                  _buildButton('8', onTap: () => _onNumber('8')),
                  _buildButton('9', onTap: () => _onNumber('9')),
                  _buildButton('*', color: Colors.orange, onTap: () => _onOperator('*')),
                ]),
                Row(children: [
                  _buildButton('4', onTap: () => _onNumber('4')),
                  _buildButton('5', onTap: () => _onNumber('5')),
                  _buildButton('6', onTap: () => _onNumber('6')),
                  _buildButton('-', color: Colors.orange, onTap: () => _onOperator('-')),
                ]),
                Row(children: [
                  _buildButton('1', onTap: () => _onNumber('1')),
                  _buildButton('2', onTap: () => _onNumber('2')),
                  _buildButton('3', onTap: () => _onNumber('3')),
                  _buildButton('+', color: Colors.orange, onTap: () => _onOperator('+')),
                ]),
                Row(children: [
                  _buildButton('0', onTap: () => _onNumber('0')),
                  _buildButton('=', color: Colors.green, onTap: _onEquals),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
\`\`\`

사칙연산이 가능한 기본 계산기 앱입니다.`,
  },
  {
    title: '좋아요 버튼 Like 하트 애니메이션',
    url: 'https://flutter-chatbot.dev/templates/like-button',
    content: `좋아요 버튼, Like 버튼, 하트 애니메이션을 만드는 방법입니다.

\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Like Button',
      home: const LikeButtonDemo(),
    );
  }
}

class LikeButtonDemo extends StatefulWidget {
  const LikeButtonDemo({super.key});

  @override
  State<LikeButtonDemo> createState() => _LikeButtonDemoState();
}

class _LikeButtonDemoState extends State<LikeButtonDemo>
    with SingleTickerProviderStateMixin {
  bool _isLiked = false;
  int _likeCount = 42;
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleLike() {
    setState(() {
      _isLiked = !_isLiked;
      _likeCount += _isLiked ? 1 : -1;
    });
    _controller.forward().then((_) => _controller.reverse());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('좋아요 버튼')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ScaleTransition(
              scale: _scaleAnimation,
              child: IconButton(
                iconSize: 60,
                icon: Icon(
                  _isLiked ? Icons.favorite : Icons.favorite_border,
                  color: _isLiked ? Colors.red : Colors.grey,
                ),
                onPressed: _toggleLike,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '\$_likeCount likes',
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}
\`\`\`

애니메이션이 포함된 좋아요 버튼입니다.`,
  },
  {
    title: '카운터 앱 Counter 만들기',
    url: 'https://flutter-chatbot.dev/templates/counter',
    content: `카운터 앱, Counter 앱을 만드는 방법입니다. Flutter 기본 예제입니다.

\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Counter App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const CounterScreen(),
    );
  }
}

class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});

  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  int _counter = 0;

  void _increment() {
    setState(() {
      _counter++;
    });
  }

  void _decrement() {
    setState(() {
      _counter--;
    });
  }

  void _reset() {
    setState(() {
      _counter = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('카운터'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _reset,
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('버튼을 눌러 카운트하세요:', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 16),
            Text(
              '\$_counter',
              style: const TextStyle(fontSize: 72, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: _increment,
            heroTag: 'increment',
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: _decrement,
            heroTag: 'decrement',
            child: const Icon(Icons.remove),
          ),
        ],
      ),
    );
  }
}
\`\`\`

기본적인 카운터 앱입니다. setState를 사용한 상태 관리를 보여줍니다.`,
  },
];

async function addTemplates() {
  console.log('📚 Fixing template titles...\n');

  try {
    const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
      documents: FIXED_TEMPLATES.map(t => ({
        ...t,
        fetchedAt: new Date().toISOString(),
      })),
    }, {
      timeout: 120000,
    });

    console.log('✅ Success:', response.data.message);
    console.log('\nTemplates updated:');
    response.data.documents.forEach((title, i) => {
      console.log(`  ${i + 1}. ${title}`);
    });
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

addTemplates();
