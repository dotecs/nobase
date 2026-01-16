import styles from '../legal.module.css';
import { Footer } from '@/components';
import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 - 노베이스구조대',
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 홈으로
        </Link>
      </header>
      
      <main className={styles.main}>
        <article className={styles.content}>
          <h1 className={styles.title}>개인정보처리방침</h1>
          <p className={styles.lastUpdated}>최종 수정일: 2025년 12월 24일</p>

          <section className={styles.section}>
            <h2>1. 개인정보의 수집 및 이용 목적</h2>
            <p>도텍(이하 &quot;회사&quot;)은 다음 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
            <ul>
              <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지</li>
              <li>서비스 제공: 온라인 강의 서비스 제공, 콘텐츠 제공, 학습 진도 관리</li>
              <li>마케팅 및 광고: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공</li>
              <li>결제 처리: 유료 서비스 이용 시 결제 처리</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. 수집하는 개인정보 항목</h2>
            <h3>필수 수집 항목</h3>
            <ul>
              <li>이메일 주소</li>
              <li>비밀번호</li>
              <li>이름(닉네임)</li>
            </ul>
            <h3>소셜 로그인 시 수집 항목</h3>
            <ul>
              <li>Google: 이메일 주소, 이름, 프로필 사진</li>
              <li>카카오: 이메일 주소, 닉네임, 프로필 사진</li>
            </ul>
            <h3>자동 수집 항목</h3>
            <ul>
              <li>접속 IP 주소, 접속 시간, 서비스 이용 기록</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. 개인정보의 보유 및 이용 기간</h2>
            <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
            <ul>
              <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li>결제 기록: 5년 (전자상거래법)</li>
              <li>접속 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. 개인정보의 제3자 제공</h2>
            <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
            <ul>
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. 개인정보처리의 위탁</h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
            <ul>
              <li>Supabase Inc.: 회원 데이터 저장 및 인증 서비스</li>
              <li>Vercel Inc.: 웹 서비스 호스팅</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6. 정보주체의 권리·의무 및 행사방법</h2>
            <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ul>
            <p>위 권리 행사는 서비스 내 설정 페이지 또는 이메일을 통해 가능합니다.</p>
          </section>

          <section className={styles.section}>
            <h2>7. 개인정보의 파기</h2>
            <p>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
          </section>

          <section className={styles.section}>
            <h2>8. 개인정보 보호책임자</h2>
            <ul>
              <li>성명: 한철민</li>
              <li>직책: 대표</li>
              <li>이메일: [이메일 주소]</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>9. 개인정보처리방침의 변경</h2>
            <p>이 개인정보처리방침은 2025년 12월 24일부터 적용됩니다. 변경 사항이 있을 경우 웹사이트를 통해 공지합니다.</p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
