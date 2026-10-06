// Firebase の接続設定
// ここに書く値は「どの Firebase プロジェクトにつなぐか」を示すもので、パスワードではない。
// データはセキュリティルール（firestore.rules）で守る。
export const environment = {
  firebase: {
    apiKey: 'AIzaSyDjDljsBqjrjl4yG6WAheGASIOMeRls1aQ',
    authDomain: 'umeniku-bbq.firebaseapp.com',
    projectId: 'umeniku-bbq',
    storageBucket: 'umeniku-bbq.firebasestorage.app',
    messagingSenderId: '22473628122',
    appId: '1:22473628122:web:3e02f4dd1da202447a08e3',
  },
};
