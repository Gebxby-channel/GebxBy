package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.SearchResponse;
import gebxby.gebxbyblog.service.SearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SearchController.class)
@AutoConfigureMockMvc(addFilters = false)
class SearchControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SearchService searchService;

    @Test
    void searchEndpointReturnsPayload() throws Exception {
        when(searchService.search("jill", "all", 5)).thenReturn(new SearchResponse("jill", List.of(), List.of(), List.of()));

        mockMvc.perform(get("/api/search").param("q", "jill"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("jill"));
    }
}
