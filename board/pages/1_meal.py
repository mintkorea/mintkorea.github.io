import streamlit as st
import google.generativeai as genai
from PIL import Image
import datetime
import pandas as pd

# Gemini 설정
genai.configure(api_key=st.secrets["GEMINI_API_KEY"])
model = genai.GenerativeModel('gemini-1.5-flash')

st.title("🍱 식단표 AI 분석 및 저장")

uploaded_file = st.file_uploader("이미지 업로드", type=['png', 'jpg', 'jpeg'])
title = st.text_input("게시글 제목 (예: 5월 1주차 학식)")

if uploaded_file and title:
    img = Image.open(uploaded_file)
    st.image(img, width=400)
    
    if st.button("🚀 데이터베이스 전송"):
        with st.spinner("AI 분석 중..."):
            try:
                # 1. AI 분석
                prompt = "이 식단표 이미지에서 날짜와 메뉴를 추출해서 마크다운 표로 정리해줘."
                response = model.generate_content([prompt, img])
                content = response.text
                
                # 2. 구글 시트 데이터 추가
                conn = st.connection("gsheets", type=GSheetsConnection)
                # 기존 데이터 읽기
                df = conn.read(ttl="0")
                
                # 새 데이터 생성
                new_data = pd.DataFrame([{
                    "날짜": datetime.datetime.now().strftime("%Y-%m-%d"),
                    "카테고리": "식단표",
                    "제목": title,
                    "본문내용": content,
                    "등록시간": datetime.datetime.now().strftime("%H:%M:%S")
                }])
                
                # 데이터 합치기 및 저장
                updated_df = pd.concat([df, new_data], ignore_index=True)
                conn.update(data=updated_df)
                
                st.success("✅ 저장 완료!")
                st.markdown(content)
            except Exception as e:
                st.error(f"오류 발생: {e}")
