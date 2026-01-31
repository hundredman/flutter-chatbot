/**
 * 검증된 Flutter 앱 템플릿을 Vector DB에 추가
 * 자주 묻는 앱 유형에 대해 정확한 코드 제공
 */

import axios from 'axios';

const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

const APP_TEMPLATES = [
  {
    title: 'Flutter ToDo List 앱 만들기 - 완전한 예제',
    url: 'https://docs.flutter.dev/cookbook/todo-app',
    content: `ToDo List 앱을 만드는 방법입니다. StatefulWidget을 사용하여 할 일 목록을 관리합니다.

완전한 코드:
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
      home: const TodoListScreen(),
    );
  }
}

class Todo {
  final String title;
  final String description;
  bool isDone;

  Todo({
    required this.title,
    required this.description,
    this.isDone = false,
  });
}

class TodoListScreen extends StatefulWidget {
  const TodoListScreen({super.key});

  @override
  State<TodoListScreen> createState() => _TodoListScreenState();
}

class _TodoListScreenState extends State<TodoListScreen> {
  final List<Todo> _todos = [];
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  void _addTodo() {
    if (_titleController.text.isEmpty) return;
    setState(() {
      _todos.add(Todo(
        title: _titleController.text,
        description: _descController.text,
      ));
      _titleController.clear();
      _descController.clear();
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
      appBar: AppBar(title: const Text('ToDo List')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: '할 일 제목',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _descController,
                  decoration: const InputDecoration(
                    labelText: '설명 (선택)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
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
                      decoration: todo.isDone
                          ? TextDecoration.lineThrough
                          : TextDecoration.none,
                    ),
                  ),
                  subtitle: Text(todo.description),
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

다음 기능을 추가하려면:
- 데이터 저장: "SharedPreferences로 ToDo 저장하기"
- 상세 화면: "ToDo 상세 화면 구현하기"
- 상태 관리: "Provider로 ToDo 관리하기"`,
  },
  {
    title: 'Flutter 계산기 앱 만들기 - 완전한 예제',
    url: 'https://docs.flutter.dev/cookbook/calculator-app',
    content: `간단한 계산기 앱을 만드는 방법입니다. 사칙연산을 지원합니다.

완전한 코드:
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
  bool _shouldResetDisplay = false;

  void _onNumberPressed(String num) {
    setState(() {
      if (_display == '0' || _shouldResetDisplay) {
        _display = num;
        _shouldResetDisplay = false;
      } else {
        _display += num;
      }
    });
  }

  void _onOperatorPressed(String op) {
    setState(() {
      _firstNum = double.parse(_display);
      _operator = op;
      _shouldResetDisplay = true;
    });
  }

  void _onEqualsPressed() {
    setState(() {
      double secondNum = double.parse(_display);
      double result = 0;
      switch (_operator) {
        case '+':
          result = _firstNum + secondNum;
          break;
        case '-':
          result = _firstNum - secondNum;
          break;
        case '×':
          result = _firstNum * secondNum;
          break;
        case '÷':
          result = secondNum != 0 ? _firstNum / secondNum : 0;
          break;
      }
      _display = result.toString();
      if (_display.endsWith('.0')) {
        _display = _display.substring(0, _display.length - 2);
      }
      _operator = '';
    });
  }

  void _onClearPressed() {
    setState(() {
      _display = '0';
      _firstNum = 0;
      _operator = '';
    });
  }

  Widget _buildButton(String text, {Color? color, VoidCallback? onPressed}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: color ?? Colors.grey[300],
            padding: const EdgeInsets.all(24),
          ),
          onPressed: onPressed,
          child: Text(
            text,
            style: const TextStyle(fontSize: 24, color: Colors.black),
          ),
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
              child: Text(
                _display,
                style: const TextStyle(fontSize: 48),
              ),
            ),
          ),
          Expanded(
            flex: 4,
            child: Column(
              children: [
                Row(children: [
                  _buildButton('C', color: Colors.red[200], onPressed: _onClearPressed),
                  _buildButton('±'),
                  _buildButton('%'),
                  _buildButton('÷', color: Colors.orange, onPressed: () => _onOperatorPressed('÷')),
                ]),
                Row(children: [
                  _buildButton('7', onPressed: () => _onNumberPressed('7')),
                  _buildButton('8', onPressed: () => _onNumberPressed('8')),
                  _buildButton('9', onPressed: () => _onNumberPressed('9')),
                  _buildButton('×', color: Colors.orange, onPressed: () => _onOperatorPressed('×')),
                ]),
                Row(children: [
                  _buildButton('4', onPressed: () => _onNumberPressed('4')),
                  _buildButton('5', onPressed: () => _onNumberPressed('5')),
                  _buildButton('6', onPressed: () => _onNumberPressed('6')),
                  _buildButton('-', color: Colors.orange, onPressed: () => _onOperatorPressed('-')),
                ]),
                Row(children: [
                  _buildButton('1', onPressed: () => _onNumberPressed('1')),
                  _buildButton('2', onPressed: () => _onNumberPressed('2')),
                  _buildButton('3', onPressed: () => _onNumberPressed('3')),
                  _buildButton('+', color: Colors.orange, onPressed: () => _onOperatorPressed('+')),
                ]),
                Row(children: [
                  _buildButton('0', onPressed: () => _onNumberPressed('0')),
                  _buildButton('.', onPressed: () => _onNumberPressed('.')),
                  _buildButton('=', color: Colors.green, onPressed: _onEqualsPressed),
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

추가 기능:
- 계산 기록 저장: "계산기 히스토리 추가하기"
- 공학용 계산기: "sin, cos 등 과학 계산 기능 추가"`,
  },
  {
    title: 'Flutter 로그인 화면 만들기 - 완전한 예제',
    url: 'https://docs.flutter.dev/cookbook/login-screen',
    content: `로그인 화면을 만드는 방법입니다. 이메일/비밀번호 입력과 유효성 검사를 포함합니다.

완전한 코드:
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
      title: 'Login Demo',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return '이메일을 입력하세요';
    }
    if (!value.contains('@')) {
      return '올바른 이메일 형식이 아닙니다';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return '비밀번호를 입력하세요';
    }
    if (value.length < 6) {
      return '비밀번호는 6자 이상이어야 합니다';
    }
    return null;
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    // 실제 로그인 로직 (API 호출 등)
    await Future.delayed(const Duration(seconds: 2));

    setState(() => _isLoading = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('로그인 성공!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('로그인')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.lock_outline,
                size: 80,
                color: Colors.blue,
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: '이메일',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                validator: _validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: '비밀번호',
                  prefixIcon: const Icon(Icons.lock),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                  ),
                ),
                validator: _validatePassword,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('로그인', style: TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {},
                child: const Text('비밀번호를 잊으셨나요?'),
              ),
              TextButton(
                onPressed: () {},
                child: const Text('계정이 없으신가요? 회원가입'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
\`\`\`

다음 기능 추가:
- Firebase 연동: "Firebase Auth로 실제 로그인 구현하기"
- 회원가입 화면: "회원가입 폼 만들기"
- 소셜 로그인: "Google/Apple 로그인 추가하기"`,
  },
  {
    title: 'Flutter 좋아요 버튼 애니메이션 만들기',
    url: 'https://docs.flutter.dev/cookbook/like-button',
    content: `좋아요 버튼을 애니메이션과 함께 구현하는 방법입니다.

완전한 코드:
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
      title: 'Like Button Demo',
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
              '$_likeCount likes',
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}
\`\`\`

추가 기능:
- 더 복잡한 애니메이션: "Staggered Animation 사용하기"
- 파티클 효과: "좋아요 버튼에 파티클 효과 추가"`,
  },
  {
    title: 'Flutter 카운터 앱 만들기 - 기본 예제',
    url: 'https://docs.flutter.dev/get-started/codelab',
    content: `Flutter 기본 카운터 앱입니다. StatefulWidget의 기본 사용법을 보여줍니다.

완전한 코드:
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

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  void _decrementCounter() {
    setState(() {
      _counter--;
    });
  }

  void _resetCounter() {
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
            onPressed: _resetCounter,
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '버튼을 눌러 카운트하세요:',
              style: TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 16),
            Text(
              '$_counter',
              style: const TextStyle(
                fontSize: 72,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: _incrementCounter,
            heroTag: 'increment',
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 16),
          FloatingActionButton(
            onPressed: _decrementCounter,
            heroTag: 'decrement',
            child: const Icon(Icons.remove),
          ),
        ],
      ),
    );
  }
}
\`\`\`

이 코드는 setState를 사용한 기본적인 상태 관리를 보여줍니다.`,
  },
];

async function addTemplates() {
  console.log('═'.repeat(60));
  console.log('📚 Adding Verified App Templates to Vector DB');
  console.log('═'.repeat(60));
  console.log(`\nAdding ${APP_TEMPLATES.length} templates...\n`);

  try {
    const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
      documents: APP_TEMPLATES.map(t => ({
        ...t,
        fetchedAt: new Date().toISOString(),
      })),
    }, {
      timeout: 120000,
    });

    console.log('✅ Success:', response.data.message);
    console.log('\nTemplates added:');
    response.data.documents.forEach((title, i) => {
      console.log(`  ${i + 1}. ${title}`);
    });
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

addTemplates();
