/**
 * Flutter Learning Curriculum
 * Complete 16-week / 6-part learning guide
 */

export const curriculum = {
  parts: [
    {
      id: 1,
      title: {
        en: "Getting Started",
        ko: "시작하기"
      },
      color: "#4CAF50",
      weeks: "1-2",
      chapters: [
        {
          id: 1,
          title: { en: "Flutter Introduction", ko: "Flutter 소개" },
          questions: [
            { id: "Q1", en: "What is Flutter?", ko: "Flutter가 뭔가요?" },
            { id: "Q2", en: "What can I build with Flutter?", ko: "Flutter로 무엇을 만들 수 있나요?" },
            { id: "Q3", en: "How is Flutter different from other frameworks?", ko: "Flutter와 다른 프레임워크의 차이는?" },
            { id: "Q4", en: "Why should I learn Flutter?", ko: "Flutter를 배우면 좋은 이유는?" }
          ]
        },
        {
          id: 2,
          title: { en: "Development Environment Setup", ko: "개발 환경 설정" },
          questions: [
            { id: "Q5", en: "How do I install Flutter?", ko: "Flutter 설치는 어떻게 하나요?" },
            { id: "Q6", en: "Installing Flutter on Windows", ko: "Windows에서 Flutter 설치하기" },
            { id: "Q7", en: "Installing Flutter on macOS", ko: "macOS에서 Flutter 설치하기" },
            { id: "Q8", en: "What is the flutter doctor command?", ko: "flutter doctor 명령어가 뭔가요?" },
            { id: "Q9", en: "I'm getting flutter doctor errors", ko: "flutter doctor 오류가 나요" },
            { id: "Q10", en: "Is Android Studio required?", ko: "Android Studio 설치는 필수인가요?" },
            { id: "Q11", en: "Can I develop with VS Code?", ko: "VS Code로도 개발할 수 있나요?" }
          ]
        },
        {
          id: 3,
          title: { en: "Dart Basics", ko: "Dart 기초" },
          questions: [
            { id: "Q12", en: "What is the Dart language?", ko: "Dart 언어가 뭔가요?" },
            { id: "Q13", en: "How do I declare variables?", ko: "변수 선언은 어떻게 하나요?" },
            { id: "Q14", en: "What's the difference between var, final, and const?", ko: "var, final, const의 차이는?" },
            { id: "Q15", en: "How do I create functions?", ko: "함수는 어떻게 만드나요?" },
            { id: "Q16", en: "What is a class?", ko: "클래스가 뭔가요?" },
            { id: "Q17", en: "What is Null Safety?", ko: "Null Safety가 뭔가요?" }
          ]
        },
        {
          id: 4,
          title: { en: "First App", ko: "첫 번째 앱" },
          questions: [
            { id: "Q18", en: "How do I create my first app?", ko: "첫 앱은 어떻게 만드나요?" },
            { id: "Q19", en: "What is the main() function?", ko: "main() 함수가 뭔가요?" },
            { id: "Q20", en: "What does runApp() do?", ko: "runApp()은 무엇을 하나요?" },
            { id: "Q21", en: "What is Hot Reload?", ko: "Hot Reload가 뭔가요?" },
            { id: "Q22", en: "Running on an emulator", ko: "에뮬레이터에서 실행하기" },
            { id: "Q23", en: "Running on a real device", ko: "실제 기기에서 실행하기" }
          ]
        }
      ]
    },
    {
      id: 2,
      title: {
        en: "Basic Widgets",
        ko: "기본 위젯"
      },
      color: "#2196F3",
      weeks: "3-5",
      chapters: [
        {
          id: 5,
          title: { en: "Widget Basics", ko: "위젯 기초" },
          questions: [
            { id: "Q24", en: "What is a widget?", ko: "위젯이 뭔가요?" },
            { id: "Q25", en: "What is StatelessWidget?", ko: "StatelessWidget이 뭔가요?" },
            { id: "Q26", en: "What is MaterialApp?", ko: "MaterialApp이 뭔가요?" },
            { id: "Q27", en: "What is Scaffold?", ko: "Scaffold가 뭔가요?" },
            { id: "Q28", en: "How do I use AppBar?", ko: "AppBar 사용법은?" },
            { id: "Q29", en: "What is the body property?", ko: "body 속성은 뭔가요?" }
          ]
        },
        {
          id: 6,
          title: { en: "Basic Widgets", ko: "기본 위젯들" },
          questions: [
            { id: "Q30", en: "How do I use the Text widget?", ko: "Text 위젯 사용법은?" },
            { id: "Q31", en: "Changing text styles", ko: "텍스트 스타일 바꾸기" },
            { id: "Q32", en: "What is the Container widget?", ko: "Container 위젯이 뭔가요?" },
            { id: "Q33", en: "What's the difference between padding and margin?", ko: "padding과 margin의 차이는?" },
            { id: "Q34", en: "Adding images with Image widget", ko: "Image 위젯으로 이미지 넣기" },
            { id: "Q35", en: "How do I use the Icon widget?", ko: "Icon 위젯 사용법은?" },
            { id: "Q36", en: "What types of buttons are there?", ko: "Button 종류에는 뭐가 있나요?" },
            { id: "Q37", en: "How do I use ElevatedButton?", ko: "ElevatedButton 사용법은?" },
            { id: "Q38", en: "Difference between TextButton and OutlinedButton", ko: "TextButton과 OutlinedButton의 차이는?" }
          ]
        },
        {
          id: 7,
          title: { en: "Layout Widgets", ko: "레이아웃 위젯" },
          questions: [
            { id: "Q39", en: "What is Column?", ko: "Column이 뭔가요?" },
            { id: "Q40", en: "What is Row?", ko: "Row가 뭔가요?" },
            { id: "Q41", en: "What's the difference between Column and Row?", ko: "Column과 Row의 차이는?" },
            { id: "Q42", en: "What is mainAxisAlignment?", ko: "mainAxisAlignment가 뭔가요?" },
            { id: "Q43", en: "What is crossAxisAlignment?", ko: "crossAxisAlignment가 뭔가요?" },
            { id: "Q44", en: "What is the Stack widget?", ko: "Stack 위젯이 뭔가요?" },
            { id: "Q45", en: "How do I use Positioned?", ko: "Positioned 위젯 사용법은?" },
            { id: "Q46", en: "When do I use Center?", ko: "Center 위젯은 언제 쓰나요?" },
            { id: "Q47", en: "Difference between Expanded and Flexible", ko: "Expanded와 Flexible의 차이는?" },
            { id: "Q48", en: "Adding spacing with SizedBox", ko: "SizedBox로 간격 주기" }
          ]
        },
        {
          id: 8,
          title: { en: "Lists and Grids", ko: "리스트와 그리드" },
          questions: [
            { id: "Q49", en: "What is ListView?", ko: "ListView가 뭔가요?" },
            { id: "Q50", en: "How do I use ListView.builder?", ko: "ListView.builder 사용법은?" },
            { id: "Q51", en: "What is GridView?", ko: "GridView가 뭔가요?" },
            { id: "Q52", en: "What is the ListTile widget?", ko: "ListTile 위젯이 뭔가요?" },
            { id: "Q53", en: "Scrolling isn't working", ko: "스크롤이 안 돼요" }
          ]
        }
      ]
    },
    {
      id: 3,
      title: {
        en: "State Management Basics",
        ko: "상태 관리 기초"
      },
      color: "#FF9800",
      weeks: "6-8",
      chapters: [
        {
          id: 9,
          title: { en: "StatefulWidget", ko: "StatefulWidget" },
          questions: [
            { id: "Q54", en: "What is StatefulWidget?", ko: "StatefulWidget이 뭔가요?" },
            { id: "Q55", en: "Difference from StatelessWidget?", ko: "StatelessWidget과의 차이는?" },
            { id: "Q56", en: "When do I use StatefulWidget?", ko: "언제 StatefulWidget을 쓰나요?" },
            { id: "Q57", en: "What is the State class?", ko: "State 클래스가 뭔가요?" },
            { id: "Q58", en: "What is setState()?", ko: "setState()가 뭔가요?" },
            { id: "Q59", en: "Screen doesn't update after setState()", ko: "setState()를 호출했는데 화면이 안 바뀌어요" },
            { id: "Q60", en: "What should I do inside setState()?", ko: "setState() 안에서 뭘 해야 하나요?" }
          ]
        },
        {
          id: 10,
          title: { en: "User Input", ko: "사용자 입력" },
          questions: [
            { id: "Q61", en: "What is the TextField widget?", ko: "TextField 위젯이 뭔가요?" },
            { id: "Q62", en: "What is TextEditingController?", ko: "TextEditingController가 뭔가요?" },
            { id: "Q63", en: "Getting input values", ko: "입력값 가져오기" },
            { id: "Q64", en: "How do I use Checkbox?", ko: "Checkbox 사용법은?" },
            { id: "Q65", en: "What is the Switch widget?", ko: "Switch 위젯이 뭔가요?" },
            { id: "Q66", en: "Creating Radio buttons", ko: "Radio 버튼 만들기" },
            { id: "Q67", en: "How do I use Slider?", ko: "Slider 위젯 사용법은?" }
          ]
        },
        {
          id: 11,
          title: { en: "Simple Apps", ko: "간단한 앱 만들기" },
          questions: [
            { id: "Q68", en: "Building a counter app", ko: "카운터 앱 만들기" },
            { id: "Q69", en: "Building a to-do list app", ko: "To-Do 리스트 앱 만들기" },
            { id: "Q70", en: "Building a calculator app", ko: "계산기 앱 만들기" },
            { id: "Q71", en: "Building a like button", ko: "좋아요 버튼 만들기" }
          ]
        }
      ]
    },
    {
      id: 4,
      title: {
        en: "Provider State Management",
        ko: "Provider 상태 관리"
      },
      color: "#9C27B0",
      weeks: "9-10",
      chapters: [
        {
          id: 12,
          title: { en: "Provider Basics", ko: "Provider 기초" },
          questions: [
            { id: "Q72", en: "What is Provider?", ko: "Provider가 뭔가요?" },
            { id: "Q73", en: "Why do we need Provider?", ko: "Provider는 왜 필요한가요?" },
            { id: "Q74", en: "Difference between setState and Provider?", ko: "setState와 Provider의 차이는?" },
            { id: "Q75", en: "Installing Provider", ko: "Provider 설치하기" },
            { id: "Q76", en: "What is ChangeNotifier?", ko: "ChangeNotifier가 뭔가요?" },
            { id: "Q77", en: "What is notifyListeners()?", ko: "notifyListeners()가 뭔가요?" }
          ]
        },
        {
          id: 13,
          title: { en: "Using Provider", ko: "Provider 사용하기" },
          questions: [
            { id: "Q78", en: "How do I use ChangeNotifierProvider?", ko: "ChangeNotifierProvider 사용법은?" },
            { id: "Q79", en: "What is the Consumer widget?", ko: "Consumer 위젯이 뭔가요?" },
            { id: "Q80", en: "Difference between Provider.of() and Consumer?", ko: "Provider.of()와 Consumer의 차이는?" },
            { id: "Q81", en: "What is context.watch()?", ko: "context.watch()가 뭔가요?" },
            { id: "Q82", en: "What is context.read()?", ko: "context.read()가 뭔가요?" },
            { id: "Q83", en: "How do I use MultiProvider?", ko: "MultiProvider 사용법은?" }
          ]
        },
        {
          id: 14,
          title: { en: "Provider in Practice", ko: "Provider 실전" },
          questions: [
            { id: "Q84", en: "Building a shopping cart app (Provider)", ko: "장바구니 앱 만들기 (Provider)" },
            { id: "Q85", en: "Managing login state", ko: "로그인 상태 관리하기" },
            { id: "Q86", en: "Building theme switching feature", ko: "테마 변경 기능 만들기" },
            { id: "Q87", en: "Provider best practices", ko: "Provider 사용 시 주의사항" }
          ]
        }
      ]
    },
    {
      id: 5,
      title: {
        en: "Network & Data",
        ko: "네트워크와 데이터"
      },
      color: "#00BCD4",
      weeks: "11-13",
      chapters: [
        {
          id: 15,
          title: { en: "HTTP Communication", ko: "HTTP 통신" },
          questions: [
            { id: "Q88", en: "What is the HTTP package?", ko: "HTTP 패키지가 뭔가요?" },
            { id: "Q89", en: "Making GET requests", ko: "GET 요청 보내기" },
            { id: "Q90", en: "Making POST requests", ko: "POST 요청 보내기" },
            { id: "Q91", en: "Handling API responses", ko: "API 응답 처리하기" },
            { id: "Q92", en: "What is JSON parsing?", ko: "JSON 파싱이 뭔가요?" },
            { id: "Q93", en: "Creating fromJson() method", ko: "fromJson() 메서드 만들기" },
            { id: "Q94", en: "What is FutureBuilder?", ko: "FutureBuilder가 뭔가요?" },
            { id: "Q95", en: "What are async and await?", ko: "async와 await이 뭔가요?" }
          ]
        },
        {
          id: 16,
          title: { en: "Firebase Integration", ko: "Firebase 연동" },
          questions: [
            { id: "Q96", en: "What is Firebase?", ko: "Firebase가 뭔가요?" },
            { id: "Q97", en: "Creating a Firebase project", ko: "Firebase 프로젝트 만들기" },
            { id: "Q98", en: "Installing Firebase", ko: "Firebase 설치하기" },
            { id: "Q99", en: "How do I use FirebaseAuth?", ko: "FirebaseAuth 사용법은?" },
            { id: "Q100", en: "Implementing email login", ko: "이메일 로그인 구현하기" },
            { id: "Q101", en: "Integrating Google login", ko: "Google 로그인 연동하기" },
            { id: "Q102", en: "What is Firestore?", ko: "Firestore가 뭔가요?" },
            { id: "Q103", en: "Reading data (Firestore)", ko: "데이터 읽기 (Firestore)" },
            { id: "Q104", en: "Writing data (Firestore)", ko: "데이터 쓰기 (Firestore)" },
            { id: "Q105", en: "Updating and deleting data", ko: "데이터 업데이트와 삭제" },
            { id: "Q106", en: "Real-time data with StreamBuilder", ko: "StreamBuilder로 실시간 데이터" }
          ]
        },
        {
          id: 17,
          title: { en: "Images and Files", ko: "이미지와 파일" },
          questions: [
            { id: "Q107", en: "Building image picker feature", ko: "이미지 선택 기능 만들기" },
            { id: "Q108", en: "Taking photos with camera", ko: "카메라로 사진 찍기" },
            { id: "Q109", en: "Uploading to Firebase Storage", ko: "Firebase Storage에 업로드" },
            { id: "Q110", en: "Saving files locally", ko: "로컬에 파일 저장하기" }
          ]
        }
      ]
    },
    {
      id: 6,
      title: {
        en: "Advanced Features",
        ko: "고급 기능"
      },
      color: "#E91E63",
      weeks: "14-16",
      chapters: [
        {
          id: 18,
          title: { en: "Navigation", ko: "내비게이션" },
          questions: [
            { id: "Q111", en: "How do I navigate between screens?", ko: "화면 이동은 어떻게 하나요?" },
            { id: "Q112", en: "How do I use Navigator.push()?", ko: "Navigator.push() 사용법은?" },
            { id: "Q113", en: "Going back?", ko: "뒤로 가기는?" },
            { id: "Q114", en: "Passing data between screens", ko: "데이터 전달하기" },
            { id: "Q115", en: "Receiving results", ko: "결과 받아오기" },
            { id: "Q116", en: "What are Named Routes?", ko: "Named Routes가 뭔가요?" },
            { id: "Q117", en: "Building BottomNavigationBar", ko: "BottomNavigationBar 만들기" },
            { id: "Q118", en: "How do I use TabBar?", ko: "TabBar 사용법은?" },
            { id: "Q119", en: "Building a Drawer menu", ko: "Drawer 메뉴 만들기" }
          ]
        },
        {
          id: 19,
          title: { en: "Animations", ko: "애니메이션" },
          questions: [
            { id: "Q120", en: "What are animations?", ko: "애니메이션이 뭔가요?" },
            { id: "Q121", en: "What is AnimationController?", ko: "AnimationController가 뭔가요?" },
            { id: "Q122", en: "What is Tween?", ko: "Tween이 뭔가요?" },
            { id: "Q123", en: "Building simple animations", ko: "간단한 애니메이션 만들기" },
            { id: "Q124", en: "What is Hero animation?", ko: "Hero 애니메이션이 뭔가요?" },
            { id: "Q125", en: "Page transition animations", ko: "페이지 전환 애니메이션" }
          ]
        },
        {
          id: 20,
          title: { en: "Using Packages", ko: "패키지 활용" },
          questions: [
            { id: "Q126", en: "What is pub.dev?", ko: "pub.dev가 뭔가요?" },
            { id: "Q127", en: "Installing packages", ko: "패키지 설치하기" },
            { id: "Q128", en: "Recommended useful packages", ko: "유용한 패키지 추천" },
            { id: "Q129", en: "How do I use shared_preferences?", ko: "shared_preferences 사용법" },
            { id: "Q130", en: "Opening links with url_launcher", ko: "url_launcher로 링크 열기" }
          ]
        },
        {
          id: 21,
          title: { en: "Testing and Debugging", ko: "테스트와 디버깅" },
          questions: [
            { id: "Q131", en: "Debugging with print()", ko: "print()로 디버깅하기" },
            { id: "Q132", en: "Debug mode vs release mode", ko: "디버그 모드와 릴리즈 모드" },
            { id: "Q133", en: "Solving common errors", ko: "흔한 오류 해결하기" },
            { id: "Q134", en: "Performance optimization tips", ko: "성능 최적화 팁" }
          ]
        },
        {
          id: 22,
          title: { en: "App Deployment", ko: "앱 배포" },
          questions: [
            { id: "Q135", en: "Building Android app", ko: "Android 앱 빌드하기" },
            { id: "Q136", en: "Building iOS app", ko: "iOS 앱 빌드하기" },
            { id: "Q137", en: "Play Store publishing guide", ko: "Play Store 출시 가이드" },
            { id: "Q138", en: "App Store publishing guide", ko: "App Store 출시 가이드" }
          ]
        }
      ]
    }
  ]
};

export default curriculum;
