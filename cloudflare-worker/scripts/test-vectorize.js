/**
 * Vectorize에 테스트 데이터 삽입
 */

// 테스트용 Flutter 문서 데이터
const testDocs = [
  {
    title: "What is Flutter?",
    content: "Flutter is an open-source UI software development kit created by Google. It is used to develop cross-platform applications for Android, iOS, Linux, macOS, Windows, and the web from a single codebase. Flutter uses the Dart programming language and provides a rich set of pre-built widgets.",
    url: "https://docs.flutter.dev/",
  },
  {
    title: "Getting Started with Flutter",
    content: "To get started with Flutter, you need to install the Flutter SDK and set up your development environment. You can use Android Studio, VS Code, or IntelliJ IDEA as your IDE. Flutter supports hot reload, which allows you to see changes instantly without restarting your app.",
    url: "https://docs.flutter.dev/get-started",
  },
  {
    title: "Flutter Widgets",
    content: "Flutter widgets are the building blocks of a Flutter app's user interface. Everything in Flutter is a widget, from a simple button to a complex layout. There are two types of widgets: StatelessWidget for static content and StatefulWidget for dynamic content that can change over time.",
    url: "https://docs.flutter.dev/development/ui/widgets-intro",
  },
  {
    title: "State Management in Flutter",
    content: "State management is crucial in Flutter applications. Common approaches include setState for simple cases, Provider for medium complexity, Bloc for enterprise apps, and Riverpod as a modern alternative. Choose based on your app's complexity and team preference.",
    url: "https://docs.flutter.dev/development/data-and-backend/state-mgmt",
  },
  {
    title: "Flutter Navigation",
    content: "Flutter provides powerful navigation features through the Navigator widget. You can push and pop routes, pass data between screens, and create named routes. For complex navigation, consider using packages like go_router or auto_route.",
    url: "https://docs.flutter.dev/cookbook/navigation",
  }
];

console.log('🧪 Testing Vectorize with sample Flutter docs...\n');

// Wrangler를 통해 Worker 실행 컨텍스트에서 테스트
console.log('Sample documents to insert:');
testDocs.forEach((doc, i) => {
  console.log(`${i + 1}. ${doc.title}`);
});

console.log('\n✅ Test data prepared!');
console.log('\n📝 Next: Run this to insert data:');
console.log('curl -X POST https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev/api/test-insert');
