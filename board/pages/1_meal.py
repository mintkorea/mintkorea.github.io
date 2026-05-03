import streamlit as st
import google.generativeai as genai
from PIL import Image
import datetime
import pandas as pd
from streamlit_gsheets import GSheetsConnection

# 1. 페이지 설정
st.set_page_config(page_title="식단표 AI 관리", layout="wide")
st.title("🍱 식단표 AI 분석 및 저장")

# 2. 보안 설정 (Secrets에서 가져오기)
try:
    # Gemini API 설정
    genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
    
    # 404 에러 방지를 위해 사용 가능한 모델 리스트에서 직접 확인하거나 가장 안정적인 명칭 사용
    # 모델 선언 (버전 문제를 피하기 위해 'models/' 접두사 없이 선언)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
except Exception as e:
    st.error(f"설정 로드 중 오류 발생: {e}")

# 3. 파일 업로드 및 제목 입력
uploaded_file = st.file_uploader("식단표 이미지를 업로드하세요", type=['png', 'jpg', 'jpeg'])
title = st.text_input("게시글 제목 (예: 2024년 5월 1주차 식단)")

# 4. 분석 및 저장 로직
if uploaded_file and title:
    # 이미지 미리보기
    img = Image.open(uploaded_file)
    st.image(img, caption="업로드된 이미지", width=500)
    
    if st.button("🚀 AI 분석 및 데이터베이스 저장"):
        with st.spinner("AI가 식단표를 분석하고 있습니다..."):
            try:
                # [단계 1] Gemini AI 분석
                # 이미지와 프롬프트를 함께 전달
                prompt = "이 식단표 이미지에서 날짜와 메뉴를 추출해서 마크다운 표(날짜, 아침, 점심, 저녁 등) 형식으로 깔끔하게 정리해줘."
                response = model.generate_content([prompt, img])
                analysis_result = response.text
                
                # [단계 2] 구글 시트 연결 및 데이터 저장
                # 키 파일(JSON) 없이 Secrets의 URL 정보를 이용해 연결
                conn = st.connection("gsheets", type=GSheetsConnection)
                
                # 기존 데이터 불러오기 (캐시 없이 최신 데이터 읽기)
                existing_df = conn.read(ttl="0")
                
                # 새 데이터 행 생성
                new_row = pd.DataFrame([{
                    "날짜": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "카테고리": "식단표",
                    "제목": title,
                    "본문내용": analysis_result,
                    "등록시간": datetime.datetime.now().strftime("%H:%M:%S")
                }])
                
                # 기존 데이터에 새 데이터 추가
                updated_df = pd.concat([existing_df, new_row], ignore_index=True)
                
                # 시트 업데이트
                conn.update(data=updated_df)
                
                # [단계 3] 결과 출력
                st.success("✅ 구글 시트에 성공적으로 저장되었습니다!")
                st.divider()
                st.subheader("📋 AI 분석 결과")
                st.markdown(analysis_result)
                
            except Exception as e:
                # 404 에러나 권한 오류 발생 시 상세 내용 출력
                if "404" in str(e):
                    st.error("오류 404: 'gemini-1.5-flash' 모델을 찾을 수 없습니다. API 키의 유효성이나 지역 제한을 확인하세요.")
                else:
                    st.error(f"상세 오류 발생: {e}")

# 5. 도움말
with st.expander("사용법 및 주의사항"):
    st.write("""
    - **API Key**: Streamlit Cloud의 Secrets에 `GEMINI_API_KEY`가 설정되어 있어야 합니다.
    - **Google Sheets**: `[connections.gsheets]` 섹션에 시트 URL이 정확히 입력되어 있어야 합니다.
    - **시트 권한**: 시트의 공유 설정에서 '링크가 있는 모든 사용자 - 편집자'로 설정하거나 서비스 계정 이메일을 추가해야 합니다.
    """)
